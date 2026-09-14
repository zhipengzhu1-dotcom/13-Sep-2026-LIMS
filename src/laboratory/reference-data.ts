import type { DatabaseSync } from 'node:sqlite';
import {
  seededAcceptableIntakes,
  type AcceptableIntake,
  type AcceptableIntakeEntry,
} from './limits.ts';

/**
 * The Acceptable intake entries: append-only reference data, refused updates
 * and deletes by the database. A new database starts with the seeded entries,
 * written as one statement so it is never half seeded.
 */
export class AcceptableIntakeStore {
  constructor(private db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS acceptableIntakes (id INTEGER PRIMARY KEY, analyteId TEXT NOT NULL, value REAL NOT NULL, sourceTitle TEXT NOT NULL, sourceUrl TEXT NOT NULL, sourceRevisionDate TEXT NOT NULL, effectiveFrom TEXT NOT NULL, illustrative INTEGER NOT NULL);
      CREATE TRIGGER IF NOT EXISTS acceptableIntakesNoUpdate BEFORE UPDATE ON acceptableIntakes BEGIN SELECT RAISE(ABORT, 'Acceptable intake entries are append-only.'); END;
      CREATE TRIGGER IF NOT EXISTS acceptableIntakesNoDelete BEFORE DELETE ON acceptableIntakes BEGIN SELECT RAISE(ABORT, 'Acceptable intake entries are append-only.'); END;`);
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
        .all() as (Omit<AcceptableIntake, 'illustrative'> & {
        illustrative: number;
      })[]
    ).map((row) => ({ ...row, illustrative: row.illustrative === 1 }));
  }

  /** Appends entries in order, each given the next id. */
  append(entries: readonly AcceptableIntakeEntry[]): AcceptableIntake[] {
    const rows = this.db
      .prepare(
        `INSERT INTO acceptableIntakes (analyteId, value, sourceTitle, sourceUrl, sourceRevisionDate, effectiveFrom, illustrative)
         VALUES ${entries.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')} RETURNING id`,
      )
      .all(
        ...entries.flatMap((e) => [
          e.analyteId,
          e.value,
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
