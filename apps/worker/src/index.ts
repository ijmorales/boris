import 'dotenv/config';
import { run } from 'graphile-worker';
import { env } from './lib/env.js';
import { tasks } from './tasks/index.js';

async function main() {
  console.log('Starting Graphile Worker...');

  const runner = await run({
    connectionString: env.DATABASE_URL,
    concurrency: 5,
    pollInterval: 1000,
    taskList: tasks,
  });

  console.log('Worker is running');

  await runner.promise;
}

main().catch((err) => {
  console.error('Worker failed:', err);
  process.exit(1);
});
