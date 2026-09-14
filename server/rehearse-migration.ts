import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { rehearseMigration } from './migrations.ts';

// `npm run rehearse-migration -- <database file>`: migrates a copy of the
// database and checks it before a release. The original is only read; the
// copy is kept for inspection.
const source = process.argv[2];
if (!source) {
  console.error('Usage: npm run rehearse-migration -- <database file>');
  process.exit(1);
}
const copy = join(
  mkdtempSync(join(tmpdir(), 'benchline-rehearsal-')),
  basename(source),
);
const rehearsal = rehearseMigration(resolve(source), copy);
const { migration } = rehearsal;
console.log(`Copy: ${copy}`);
console.log(
  migration.outcome === 'migrated'
    ? `Migrated from version ${migration.from} to ${migration.to}:\n${migration.applied.map((c) => `  - ${c}`).join('\n')}`
    : migration.outcome === 'refused'
      ? `Refused at version ${migration.version}.`
      : `No migration: the database is at version ${migration.version}.`,
);
console.table(rehearsal.tables);
console.log(
  `Electronic signatures checked: ${rehearsal.signatures.checked}, invalid: ${rehearsal.signatures.invalid}`,
);
console.log(
  `Certificates of Analysis checked: ${rehearsal.certificates.checked}, hash mismatches: ${rehearsal.certificates.mismatched}`,
);
console.log(
  `Attachments checked: ${rehearsal.attachments.checked}, hash mismatches: ${rehearsal.attachments.mismatched}`,
);
if (rehearsal.passed) console.log('PASSED');
else {
  console.error(
    `FAILED\n${rehearsal.problems.map((p) => `  - ${p}`).join('\n')}`,
  );
  process.exit(1);
}
