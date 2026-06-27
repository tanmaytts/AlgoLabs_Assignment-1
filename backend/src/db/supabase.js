'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// If env vars are absent (e.g. during local dev without a Supabase project),
// export a null client so the module can be imported without crashing.
// Every helper below checks for a configured client and throws a readable error
// rather than letting Supabase itself produce a cryptic stack trace.
let supabase = null;

if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      // Service role key bypasses RLS; disable auto-refresh (server context).
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Internal guard used by every helper below.
function requireClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.'
    );
  }
}

// ---------------------------------------------------------------------------
// Write helpers (used by ingest)
// ---------------------------------------------------------------------------

/**
 * Upsert a single company row. `company` must contain {ticker, name, sector,
 * industry, exchange}. Conflicts on ticker are resolved by updating all cols.
 */
async function upsertCompany(company) {
  requireClient();
  const { error } = await supabase
    .from('companies')
    .upsert(company, { onConflict: 'ticker' });
  if (error) throw new Error(`upsertCompany(${company.ticker}): ${error.message}`);
}

/**
 * Upsert a single fundamentals row. `row` must contain ticker plus numeric
 * fields. updated_at is refreshed on every upsert via the DB default.
 */
async function upsertFundamentals(row) {
  requireClient();
  // Overwrite updated_at so the UI knows when data was last refreshed.
  const payload = { ...row, updated_at: new Date().toISOString() };
  const { error } = await supabase
    .from('fundamentals')
    .upsert(payload, { onConflict: 'ticker' });
  if (error) throw new Error(`upsertFundamentals(${row.ticker}): ${error.message}`);
}

/**
 * Batch-upsert price history rows. Each row: {ticker, date, open, high, low,
 * close, volume}. Conflicts on (ticker, date) are ignored so re-running ingest
 * does not duplicate bars. We use ignoreDuplicates rather than updating because
 * historical bars do not change after the trading day closes.
 */
async function upsertPriceHistory(rows) {
  requireClient();
  if (!rows || rows.length === 0) return;

  // Supabase upsert sends all rows in one request (up to ~1 MB payload).
  // For very large datasets chunk into batches of 500 to stay under limits.
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('price_history')
      .upsert(chunk, { onConflict: 'ticker,date', ignoreDuplicates: true });
    if (error) throw new Error(`upsertPriceHistory batch [${i}]: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Read helpers (used by routes)
// ---------------------------------------------------------------------------

/**
 * Return all stocks as a joined view: company metadata + latest fundamentals.
 * Joining in JS keeps the query simple and avoids a custom DB view.
 * At 22 tickers the data is tiny so the two-round-trip cost is negligible.
 */
async function getAllStocks() {
  requireClient();

  const [{ data: companies, error: e1 }, { data: fundamentals, error: e2 }] =
    await Promise.all([
      supabase.from('companies').select('*'),
      supabase.from('fundamentals').select('*'),
    ]);

  if (e1) throw new Error(`getAllStocks companies: ${e1.message}`);
  if (e2) throw new Error(`getAllStocks fundamentals: ${e2.message}`);

  // Build a lookup map so the merge is O(n) not O(n^2).
  const fundMap = {};
  for (const f of fundamentals || []) {
    fundMap[f.ticker] = f;
  }

  return (companies || []).map((c) => ({ ...c, ...(fundMap[c.ticker] || {}) }));
}

/**
 * Return a single company merged with its latest fundamentals.
 */
async function getStock(ticker) {
  requireClient();

  const [{ data: company, error: e1 }, { data: fund, error: e2 }] =
    await Promise.all([
      supabase.from('companies').select('*').eq('ticker', ticker).single(),
      supabase.from('fundamentals').select('*').eq('ticker', ticker).single(),
    ]);

  if (e1) throw new Error(`getStock company(${ticker}): ${e1.message}`);
  // fundamentals row may not exist yet if ingest ran partially; that is fine.

  return { ...company, ...(fund || {}) };
}

/**
 * Return price history bars for `ticker` on or after `fromDate` (ISO string),
 * ordered oldest-first so the chart can render left to right.
 */
async function getPriceHistory(ticker, fromDate) {
  requireClient();

  let query = supabase
    .from('price_history')
    .select('date, open, high, low, close, volume')
    .eq('ticker', ticker)
    .order('date', { ascending: true });

  if (fromDate) {
    query = query.gte('date', fromDate);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getPriceHistory(${ticker}): ${error.message}`);
  return data || [];
}

/**
 * Aggregate stocks by sector.
 * Computed in JS because Supabase's PostgREST query language does not expose
 * GROUP BY directly. At 22 tickers this is trivially fast.
 */
async function getSectors() {
  requireClient();

  const stocks = await getAllStocks();

  const sectorMap = {};
  for (const s of stocks) {
    const sector = s.sector || 'Unknown';
    if (!sectorMap[sector]) {
      sectorMap[sector] = {
        sector,
        count: 0,
        totalMarketCap: 0,
        tickers: [],
      };
    }
    sectorMap[sector].count += 1;
    sectorMap[sector].totalMarketCap += s.market_cap || 0;
    sectorMap[sector].tickers.push(s.ticker);
  }

  return Object.values(sectorMap).sort((a, b) => b.totalMarketCap - a.totalMarketCap);
}

/**
 * Compute a market summary from the fundamentals table.
 * Returned shape: { totalStocks, avgPE, topGainers (top 3), topLosers (top 3),
 *                   positiveCount, negativeCount }.
 * Computed in JS for the same reason as getSectors.
 */
async function getMarketSummary() {
  requireClient();

  const { data: rows, error } = await supabase
    .from('fundamentals')
    .select('ticker, pe_ratio, day_change_pct');

  if (error) throw new Error(`getMarketSummary: ${error.message}`);

  const valid = (rows || []).filter((r) => r.day_change_pct != null);
  const peValid = (rows || []).filter((r) => r.pe_ratio != null && r.pe_ratio > 0);

  const avgPE =
    peValid.length > 0
      ? parseFloat(
          (peValid.reduce((sum, r) => sum + r.pe_ratio, 0) / peValid.length).toFixed(2)
        )
      : null;

  const sorted = [...valid].sort((a, b) => b.day_change_pct - a.day_change_pct);

  return {
    totalStocks: (rows || []).length,
    positiveCount: valid.filter((r) => r.day_change_pct > 0).length,
    negativeCount: valid.filter((r) => r.day_change_pct < 0).length,
    avgPE,
    topGainers: sorted.slice(0, 3),
    topLosers: sorted.slice(-3).reverse(),
  };
}

module.exports = {
  supabase,
  upsertCompany,
  upsertFundamentals,
  upsertPriceHistory,
  getAllStocks,
  getStock,
  getPriceHistory,
  getSectors,
  getMarketSummary,
};
