'use strict';

const express = require('express');
const { getAllStocks, getStock, getPriceHistory } = require('../db/supabase');

const router = express.Router();

// Map the ?range query param to a concrete fromDate string.
// The front end passes '1M', '6M', or '1Y' as shorthand.
function rangeToFromDate(range) {
  const now = new Date();
  switch ((range || '1Y').toUpperCase()) {
    case '1M':
      now.setMonth(now.getMonth() - 1);
      break;
    case '6M':
      now.setMonth(now.getMonth() - 6);
      break;
    case '1Y':
    default:
      now.setFullYear(now.getFullYear() - 1);
      break;
  }
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

// GET /api/stocks
// Returns all companies with their latest fundamentals merged in.
router.get('/', async (req, res) => {
  try {
    const stocks = await getAllStocks();
    res.json(stocks);
  } catch (err) {
    console.error('[GET /api/stocks]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stocks/:ticker
// Returns company + fundamentals for a single ticker, plus the last ~120
// trading days of price history (roughly 6 months) for the detail chart.
router.get('/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  try {
    const [stock, history] = await Promise.all([
      getStock(ticker),
      getPriceHistory(ticker, rangeToFromDate('6M')),
    ]);
    res.json({ ...stock, history });
  } catch (err) {
    console.error(`[GET /api/stocks/${ticker}]`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stocks/:ticker/history?range=1M|6M|1Y
// Returns the full date-ranged history for the charting page.
// Defaults to 1Y when the range param is absent or unrecognised.
router.get('/:ticker/history', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const fromDate = rangeToFromDate(req.query.range);
  try {
    const rows = await getPriceHistory(ticker, fromDate);
    res.json(rows);
  } catch (err) {
    console.error(`[GET /api/stocks/${ticker}/history]`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
