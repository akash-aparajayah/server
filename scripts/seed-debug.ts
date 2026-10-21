
console.log('[DEBUG] seed-debug.ts started');

async function main() {
  console.log('[DEBUG] main() started');

  try {
    const result = await import('./seed.js');
    console.log('[DEBUG] seed.ts imported successfully', !!result);
  } catch (error) {
    console.error('[DEBUG] seed.ts import failed:', error);
    process.exitCode = 1;
  }
}

main();
