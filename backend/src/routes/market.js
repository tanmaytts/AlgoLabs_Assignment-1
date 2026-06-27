'use strict';

const express = require('express');
const { getMarketSummary, getSectors } = require('../db/supabase');

const router = express.Router();

// GET /api/market/summary
// Returns an aggregate snapshot of the market: total stocks tracked, count of
// gainers vs losers, average PE, and the top 3 gainers and losers by day change.
router.get('/summary', async (req, res) => {
  try {
    const summary = await getMarketSummary();
    res.json(summary);
  } catch (err) {
    console.error('[GET /api/market/summary]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/market/sectors
// Returns all sectors with their stock count and combined market cap, sorted
// by market cap descending. Useful for the sector-breakdown pie chart.
router.get('/sectors', async (req, res) => {
  try {
    const sectors = await getSectors();
    res.json(sectors);
  } catch (err) {
    console.error('[GET /api/market/sectors]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
