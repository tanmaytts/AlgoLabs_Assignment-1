'use strict';

const { runPython } = require('./runPython');
const {
  upsertCompany,
  upsertFundamentals,
  upsertPriceHistory,
} = require('../db/supabase');
const TICKERS = require('../config/tickers');

/**
 * Fetch latest fundamentals for the supplied tickers and persist them.
 * Per-ticker errors are logged and skipped so one bad ticker never aborts
 * the whole run (the Python script uses the same defensive strategy).
 *
 * @param {string[]} tickers
 * @returns {Promise<{upserted: number, errors: string[]}>}
 */
async function ingestFundamentals(tickers) {
  console.log(`[ingest] fetching fundamentals for ${tickers.length} tickers...`);
  const results = await runPython('fetch_stocks.py', tickers);

  let upserted = 0;
  const errors = [];

  for (const item of results) {
    if (item.error) {
      const msg = `${item.ticker}: ${item.error}`;
      console.warn(`[ingest] skipping ${msg}`);
      errors.push(msg);
      continue;
    }

    try {
      // Persist static company info separately from the volatile price fields
      // so frequent fundamentals refreshes do not rewrite unchanged metadata.
      await upsertCompany({
        ticker:   item.ticker,
        name:     item.name,
        sector:   item.sector,
        industry: item.industry,
        exchange: item.exchange,
      });

      await upsertFundamentals({
        ticker:         item.ticker,
        price:          item.price,
        market_cap:     item.market_cap,
        pe_ratio:       item.pe_ratio,
        eps:            item.eps,
        day_change_pct: item.day_change_pct,
        volume:         item.volume,
        week52_high:    item.week52_high,
        week52_low:     item.week52_low,
      });

      upserted++;
    } catch (err) {
      const msg = `${item.ticker}: ${err.message}`;
      console.error(`[ingest] DB error for ${msg}`);
      errors.push(msg);
    }
  }

  console.log(`[ingest] fundamentals done - upserted: ${upserted}, errors: ${errors.length}`);
  return { upserted, errors };
}

/**
 * Fetch daily OHLCV history for a single ticker and upsert into price_history.
 * Duplicates (same ticker+date) are silently ignored by the DB constraint.
 *
 * @param {string} ticker
 * @param {string} period - yfinance period string, e.g. '1y', '6mo'
 * @returns {Promise<{ticker, rowsUpserted: number}>}
 */
async function ingestHistory(ticker, period = '1y') {
  console.log(`[ingest] fetching history for ${ticker} (${period})...`);
  const rows = await runPython('fetch_history.py', [ticker, period]);

  // Attach the ticker field the Python script does not include in each row.
  const payload = rows.map((r) => ({ ...r, ticker }));
  await upsertPriceHistory(payload);

  console.log(`[ingest] history done for ${ticker}: ${payload.length} rows`);
  return { ticker, rowsUpserted: payload.length };
}

/**
 * Full backfill: fundamentals for all tickers, then history for each.
 * History ingestion runs sequentially to avoid hammering Yahoo's API;
 * fetch_stocks.py already has a built-in 0.5 s delay between tickers for
 * the fundamentals batch.
 *
 * @param {string} period - history period to load for each ticker
 * @returns {Promise<{fundamentalsUpserted, historyTickers, errors}>}
 */
async function ingestAll(period = '1y') {
  const fundResult = await ingestFundamentals(TICKERS);

  const historyTickers = [];
  const historyErrors = [];

  for (const ticker of TICKERS) {
    try {
      await ingestHistory(ticker, period);
      historyTickers.push(ticker);
    } catch (err) {
      console.error(`[ingest] history failed for ${ticker}: ${err.message}`);
      historyErrors.push(`${ticker}: ${err.message}`);
    }
  }

  return {
    fundamentalsUpserted: fundResult.upserted,
    historyTickers,
    errors: [...fundResult.errors, ...historyErrors],
  };
}

module.exports = { ingestFundamentals, ingestHistory, ingestAll };
