#!/usr/bin/env tsx
/**
 * db-query.ts — Test Query Master
 * All ad-hoc dev/test database queries go through this system.
 * Usage: pnpm db:query <query-name>
 *        pnpm db:query:list
 */

const queryRegistry: Record<string, () => Promise<unknown>> = {
  // Register query files here:
  // 'example': () => import('./queries/example.js'),
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args[0] === '--list' || args.length === 0) {
    const keys = Object.keys(queryRegistry);
    if (keys.length === 0) {
      console.log('No queries registered yet.');
    } else {
      console.log('Registered queries:');
      keys.forEach((k) => console.log(`  - ${k}`));
    }
    return;
  }

  const name = args[0];
  if (!name || !queryRegistry[name]) {
    console.error(`Query "${name}" not found. Run --list to see available queries.`);
    process.exit(1);
  }

  const mod = (await queryRegistry[name]()) as { default: { run: (a: string[]) => Promise<void> } };
  await mod.default.run(args.slice(1));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
