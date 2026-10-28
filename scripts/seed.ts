import { seedAdmin } from './seed-admin.js';
import { seedProductSignals } from './seed-product-signals.js';

async function runSeeders(): Promise<void> {

  await seedAdmin();

  await seedProductSignals();
}

runSeeders().catch((error: unknown) => {
  console.error('[MASTER] Seeding failed:', error);
  process.exitCode = 1;
});
