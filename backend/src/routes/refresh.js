'use strict';

const express = require('express');
const { ingestFundamentals } = require('../ingest/ingest');
const TICKERS = require('../config/tickers');

const router = express.Router();

// POST /api/refresh
// Triggers an on-demand fundamentals refresh. Accepts an optional JSON body
// { "tickers": ["RELIANCE.NS", "TCS.NS"] } to refresh a subset; falls back to
// the full configured ticker list.
//
// In production you would protect this route with a shared secret or an API key
// middleware so it cannot be triggered by arbitrary clients.
router.post('/', async (req, res) => {
  const tickers =
    Array.isArray(req.body?.tickers) && req.body.tickers.length > 0
      ? req.body.tickers
      : TICKERS;

  try {
    const result = await ingestFundamentals(tickers);
    res.json({
      message: 'Refresh complete',
      tickersRequested: tickers.length,
      ...result,
    });
  } catch (err) {
    console.error('[POST /api/refresh]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
