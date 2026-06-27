'use strict';

// Load environment variables before anything else imports them.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { ingestAll } = require('./ingest');

async function main() {
  console.log('[runIngest] starting full backfill (period: 1y)...');
  const summary = await ingestAll('1y');
  console.log('[runIngest] complete.');
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error('[runIngest] fatal error:', err.message);
  process.exit(1);
});
