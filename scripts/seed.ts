console.log('[MASTER] seed.ts file loaded');

import { seedAdmin } from './seed-admin.js';
import { seedProductSignals } from './seed-product-signals.js';

async function runSeeders(): Promise<void> {
  console.log('[MASTER] Starting admin seeder...');

  await seedAdmin();
  console.log('[MASTER] Admin seeder completed.');

  console.log('[MASTER] Starting product signal seeder...');

  await seedProductSignals();
  console.log('[MASTER] Product signal seeder completed.');

  console.log('[MASTER] All seeders completed successfully.');
}

runSeeders().catch((error: unknown) => {
  console.error('[MASTER] Seeding failed:', error);
  process.exitCode = 1;
});
