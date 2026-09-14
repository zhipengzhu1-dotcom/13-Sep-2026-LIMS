import type { DatabaseSync } from 'node:sqlite';
import {
  potencyCategorySchema,
  seededAcceptableIntakes,
  type AcceptableIntake,
  type AcceptableIntakeEntry,
  type PotencyCategory,
} from './limits.ts';

/**
 * The Acceptable intake entries: append-only reference data, refused updates
 * and deletes by the database. A new database starts with the seeded entries,
 * written as one statement so it is never half seeded.
 */
export class AcceptableIntakeStore {
  constructor(private db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS acceptableIntakes (id INTEGER PRIMARY KEY, analyteId TEXT NOT NULL, value REAL NOT NULL, sourceTitle TEXT NOT NULL, sourceUrl TEXT NOT NULL, sourceRevisionDate TEXT NOT NULL, effectiveFrom TEXT NOT NULL, illustrative INTEGER NOT NULL, potencyCategory TEXT, limitType TEXT);
      CREATE TRIGGER IF NOT EXISTS acceptableIntakesNoUpdate BEFORE UPDATE ON acceptableIntakes BEGIN SELECT RAISE(ABORT, 'Acceptable intake entries are append-only.'); END;
      CREATE TRIGGER IF NOT EXISTS acceptableIntakesNoDelete BEFORE DELETE ON acceptableIntakes BEGIN SELECT RAISE(ABORT, 'Acceptable intake entries are append-only.'); END;
      CREATE TRIGGER IF NOT EXISTS acceptableIntakesNoReplace BEFORE INSERT ON acceptableIntakes
        WHEN EXISTS (SELECT 1 FROM acceptableIntakes WHERE id = NEW.id)
        BEGIN SELECT RAISE(ABORT, 'Acceptable intake entries are append-only.'); END;`);
    const { entries } = db
      .prepare('SELECT COUNT(*) AS entries FROM acceptableIntakes')
      .get() as { entries: number };
    if (!entries) this.append(seededAcceptableIntakes);
  }

  /** Every entry, current and historical, in append order. */
  list(): AcceptableIntake[] {
    return (
      this.db
        .prepare('SELECT * FROM acceptableIntakes ORDER BY id')
        .all() as (Omit<
        AcceptableIntake,
        'illustrative' | 'potencyCategory'
      > & {
        illustrative: number;
        potencyCategory: string | null;
      })[]
    ).map((row) => ({
      ...row,
      illustrative: row.illustrative === 1,
      potencyCategory: storedCategory(row.potencyCategory),
    }));
  }

  /** Appends entries in order, each given the next id. */
  append(entries: readonly AcceptableIntakeEntry[]): AcceptableIntake[] {
    const rows = this.db
      .prepare(
        `INSERT INTO acceptableIntakes (analyteId, value, potencyCategory, limitType, sourceTitle, sourceUrl, sourceRevisionDate, effectiveFrom, illustrative)
         VALUES ${entries.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')} RETURNING id`,
      )
      .all(
        ...entries.flatMap((e) => [
          e.analyteId,
          e.value,
          String(e.potencyCategory),
          e.limitType,
          e.sourceTitle,
          e.sourceUrl,
          e.sourceRevisionDate,
          e.effectiveFrom,
          e.illustrative ? 1 : 0,
        ]),
      ) as { id: number }[];
    return entries.map((e, i) => ({ ...e, id: Number(rows[i].id) }));
  }
}

/** A Potency category as stored: a category number or `not categorised` as
 * text, or null on an entry appended before categories were recorded. */
function storedCategory(stored: string | null): PotencyCategory | null {
  if (stored === null) return null;
  return potencyCategorySchema.parse(
    stored === 'not categorised' ? stored : Number(stored),
  );
}
