'use strict';

const cron = require('node-cron');
const { ingestFundamentals } = require('./ingest');
const TICKERS = require('../config/tickers');

// Price history bars are immutable once the trading day closes, so there is no
// need to refresh them on a schedule. Only fundamentals (live price, PE, etc.)
// require frequent updates.

let isRunning = false;

/**
 * Start the background scheduler.
 * Fundamentals are refreshed every 15 minutes during the trading day.
 * The guard flag prevents a slow run from overlapping with the next tick.
 */
function startScheduler() {
  // Every 15 minutes, every hour, every day.
  cron.schedule('*/15 * * * *', async () => {
    if (isRunning) {
      console.log('[scheduler] skipping tick - previous run still in progress');
      return;
    }

    isRunning = true;
    console.log('[scheduler] starting scheduled fundamentals refresh...');

    try {
      const result = await ingestFundamentals(TICKERS);
      console.log(
        `[scheduler] refresh complete - upserted: ${result.upserted}, errors: ${result.errors.length}`
      );
    } catch (err) {
      console.error('[scheduler] refresh failed:', err.message);
    } finally {
      isRunning = false;
    }
  });

  console.log('[scheduler] fundamentals refresh scheduled (every 15 minutes)');
}

module.exports = { startScheduler };
