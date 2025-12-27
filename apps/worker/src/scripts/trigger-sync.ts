import 'dotenv/config';
import { makeWorkerUtils } from 'graphile-worker';

const [startDateArg, endDateArg] = process.argv.slice(2);

if (!startDateArg || !endDateArg) {
  console.error('Usage: pnpm sync <startDate> <endDate>');
  console.error('Example: pnpm sync 2024-01-01 2024-12-31');
  process.exit(1);
}

// Validate date format
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
if (!dateRegex.test(startDateArg) || !dateRegex.test(endDateArg)) {
  console.error('Error: Dates must be in YYYY-MM-DD format');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Error: DATABASE_URL environment variable is required');
  process.exit(1);
}

/**
 * Generates monthly date ranges between start and end dates.
 * Uses UTC methods to avoid timezone issues.
 */
function generateMonthlyDateRanges(
  startDate: Date,
  endDate: Date,
): Array<{ startDate: string; endDate: string }> {
  const ranges: Array<{ startDate: string; endDate: string }> = [];

  // Work in UTC to avoid timezone issues
  let currentYear = startDate.getUTCFullYear();
  let currentMonth = startDate.getUTCMonth();
  let currentDay = startDate.getUTCDate();

  const endTime = endDate.getTime();

  while (true) {
    // Month start: either the original start date or the 1st of the month
    const monthStart = new Date(
      Date.UTC(currentYear, currentMonth, currentDay),
    );

    // Month end: last day of the current month
    const lastDayOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0));

    // Use the earlier of: last day of month or the end date
    const chunkEnd =
      lastDayOfMonth.getTime() > endTime ? endDate : lastDayOfMonth;

    ranges.push({
      startDate: monthStart.toISOString().split('T')[0],
      endDate: chunkEnd.toISOString().split('T')[0],
    });

    // If we've reached or passed the end date, stop
    if (chunkEnd.getTime() >= endTime) {
      break;
    }

    // Move to the 1st of the next month
    currentMonth += 1;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear += 1;
    }
    currentDay = 1;
  }

  return ranges;
}

// Parse dates (YYYY-MM-DD format is parsed as UTC at midnight)
const startDate = new Date(`${startDateArg}T00:00:00Z`);
const endDate = new Date(`${endDateArg}T00:00:00Z`);

// Generate monthly chunks
const dateRanges = generateMonthlyDateRanges(startDate, endDate);

console.log(
  `Queueing ${dateRanges.length} monthly sync jobs: ${startDateArg} to ${endDateArg}`,
);

const workerUtils = await makeWorkerUtils({ connectionString });

for (let i = 0; i < dateRanges.length; i++) {
  const range = dateRanges[i];
  await workerUtils.addJob(
    'sync_meta_ads',
    { startDate: range.startDate, endDate: range.endDate },
    { priority: i },
  );
  console.log(`  Job ${i + 1}: ${range.startDate} to ${range.endDate}`);
}

console.log('Jobs queued successfully. Start the worker to process them.');
await workerUtils.release();
process.exit(0);
