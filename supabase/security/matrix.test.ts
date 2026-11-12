/**
 * Runs every attack matrix file as Jest tests (`npm run test:security`). Needs a seeded
 * database: TEST_ACCOUNTS_TARGET=local with the local stack's keys, or `.env.staging`.
 */
import { context, run } from './engine';
import { files } from './matrix';

afterAll(async () => {
  await (await context()).done();
});

describe.each(Object.entries(files))('%s', (_file, rows) => {
  // Rows change shared persona data and put it back, so they run one at a time.
  it.each(rows.map((row) => [`${row.as} · ${row.op} · ${'table' in row ? row.table : row.fn}: ${row.name}`, row] as const))(
    '%s',
    async (_label, row) => {
      const { outcome, detail } = await run(row);
      if (outcome !== row.expect) {
        throw new Error(`expected ${row.expect}, got ${outcome} (${detail})`);
      }
    },
  );
});
