'use strict';

/*
 * FinPulse Express server
 *
 * Endpoints:
 *   GET  /api/health                        - liveness check
 *   GET  /api/stocks                        - all stocks (company + fundamentals)
 *   GET  /api/stocks/:ticker                - single stock + recent history
 *   GET  /api/stocks/:ticker/history        - OHLCV bars, ?range=1M|6M|1Y
 *   GET  /api/market/summary                - market-wide aggregate stats
 *   GET  /api/market/sectors                - sector breakdown by market cap
 *   POST /api/refresh                       - trigger on-demand fundamentals refresh
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const stocksRouter  = require('./routes/stocks');
const marketRouter  = require('./routes/market');
const refreshRouter = require('./routes/refresh');

const app = express();

// Allow the configured frontend origin; if CORS_ORIGIN is not set we allow all
// origins, which is acceptable during local development.
const corsOptions = process.env.CORS_ORIGIN
  ? { origin: process.env.CORS_ORIGIN }
  : {};
app.use(cors(corsOptions));

app.use(express.json());

// Health check is always available, even without Supabase credentials.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/stocks',  stocksRouter);
app.use('/api/market',  marketRouter);
app.use('/api/refresh', refreshRouter);

// Start the background scheduler only when Supabase is configured.
// This prevents crashes during local dev without credentials.
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  const { startScheduler } = require('./ingest/scheduler');
  startScheduler();
} else {
  console.warn(
    '[server] Supabase env vars not set. Scheduler disabled. DB-backed routes will return errors.'
  );
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
