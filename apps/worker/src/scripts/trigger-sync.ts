import 'dotenv/config';
import { quickAddJob } from 'graphile-worker';

const [startDate, endDate] = process.argv.slice(2);

if (!startDate || !endDate) {
  console.error('Usage: pnpm sync <startDate> <endDate>');
  console.error('Example: pnpm sync 2024-01-01 2024-12-31');
  process.exit(1);
}

// Validate date format
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
  console.error('Error: Dates must be in YYYY-MM-DD format');
  process.exit(1);
}

console.log(`Queueing sync job: ${startDate} to ${endDate}`);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Error: DATABASE_URL environment variable is required');
  process.exit(1);
}

await quickAddJob({ connectionString }, 'sync_meta_ads', {
  startDate,
  endDate,
});

console.log('Job queued successfully. Start the worker to process it.');
process.exit(0);
