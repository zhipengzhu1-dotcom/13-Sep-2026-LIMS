import type { DatabaseSync } from 'node:sqlite';
import type { Audit } from './audit-writer.ts';
import {
  materialTypes,
  type AuditedAct,
  type AuditValue,
  type Method,
} from './contracts.ts';
import { WorkflowError } from './workflow-error.ts';

/**
 * The stored Methods, which the database refuses to change, delete or
 * replace, so a Method's code and version, the number and version of its
 * controlled document, always mean the content first stored under them. The
 * migration that adds the table runs the same statements.
 */
export const methodProtection = `
  CREATE TABLE IF NOT EXISTS methods (id TEXT PRIMARY KEY, code TEXT NOT NULL, version INTEGER NOT NULL, content TEXT NOT NULL) WITHOUT ROWID;
  CREATE TRIGGER IF NOT EXISTS methodsNoUpdate BEFORE UPDATE ON methods BEGIN SELECT RAISE(ABORT, 'Stored Methods never change.'); END;
  CREATE TRIGGER IF NOT EXISTS methodsNoDelete BEFORE DELETE ON methods BEGIN SELECT RAISE(ABORT, 'Stored Methods never change.'); END;
  CREATE TRIGGER IF NOT EXISTS methodsNoReplace BEFORE INSERT ON methods
    WHEN EXISTS (SELECT 1 FROM methods WHERE id = NEW.id)
    BEGIN SELECT RAISE(ABORT, 'Stored Methods never change.'); END;`;

/** A Method's content, field by field: its audit trail field, how a refusal
 * names it, and its value. Material types count in their fixed order, so
 * listing them differently is not a change. */
const contentFields: readonly [
  field: string,
  named: string,
  value: (method: Method) => AuditValue,
][] = [
  ['code', 'code', (m) => m.code],
  ['version', 'version', (m) => m.version],
  ['analyteId', 'Analyte', (m) => m.analyteId],
  ['technique', 'technique', (m) => m.technique],
  [
    'materialTypes',
    'Material types',
    (m) => materialTypes.filter((t) => m.materialTypes.includes(t)).join(', '),
  ],
  ['ppmLod', 'LOD', (m) => m.ppmLodLoq.lod],
  ['ppmLoq', 'LOQ', (m) => m.ppmLodLoq.loq],
  ['maximumDoseCeiling', 'Maximum-dose ceiling', (m) => m.maximumDoseCeiling],
];

const content = (method: Method) =>
  Object.fromEntries(
    contentFields.map(([field, , value]) => [field, value(method)]),
  );

/** "a", "a and b", "a, b and c". */
const listed = (names: string[]) =>
  names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

export class MethodStore {
  constructor(private db: DatabaseSync) {
    db.exec(methodProtection);
  }

  /**
   * Puts a list of Methods in force. A Method not stored yet is stored, with
   * an audit entry for each field of its content; a stored one put back in
   * force, or a stored one left out of the list, is recorded as put in force
   * or withdrawn. `lastInForce` reads whether a stored Method was last put in
   * force. The whole list is checked first, so a refusal writes nothing: a
   * Method whose id is not its code and version, or one whose content differs
   * from what is stored under its id.
   */
  putInForce(
    list: readonly Method[],
    audit: (act: AuditedAct) => Audit,
    lastInForce: (id: string) => AuditValue | undefined,
  ) {
    for (const method of list) {
      const id = `${method.code}-v${method.version}`;
      if (method.id !== id)
        throw new WorkflowError(
          `Method ${method.id} must have the id ${id}, from its code and version. Nothing was changed.`,
          409,
        );
    }
    const stored = new Map(
      (
        this.db
          .prepare('SELECT id, content FROM methods ORDER BY id')
          .all() as {
          id: string;
          content: string;
        }[]
      ).map((row) => [
        row.id,
        JSON.parse(row.content) as Record<string, AuditValue>,
      ]),
    );
    for (const method of list) {
      const was = stored.get(method.id);
      if (!was) continue;
      const differs = contentFields
        .filter(([field, , value]) => was[field] !== value(method))
        .map(([, named]) => named);
      if (differs.length)
        throw new WorkflowError(
          `Method ${method.code} v${method.version} is stored with different content: its ${listed(differs)} ${differs.length === 1 ? 'differs' : 'differ'}. A revised Method is a new version, with its own code and version. Nothing was changed.`,
          409,
        );
    }

    const inList = new Set(list.map((m) => m.id));
    const added = list.filter((m) => !stored.has(m.id));
    const restored = list.filter(
      (m) => stored.has(m.id) && lastInForce(m.id) !== true,
    );
    const withdrawn = [...stored.keys()].filter(
      (id) => !inList.has(id) && lastInForce(id) === true,
    );
    if (!added.length && !restored.length && !withdrawn.length) return;

    const record = (id: string) =>
      ({ type: 'Method', id, sampleId: null }) as const;
    const insert = this.db.prepare(
      'INSERT INTO methods (id, code, version, content) VALUES (?, ?, ?, ?)',
    );
    const inForce = audit('methodInForce');
    for (const method of list) {
      if (added.includes(method)) {
        insert.run(
          method.id,
          method.code,
          method.version,
          JSON.stringify(content(method)),
        );
        for (const [field, , value] of contentFields)
          inForce.change(record(method.id), field, null, value(method));
        inForce.change(record(method.id), 'inForce', null, true);
      } else if (restored.includes(method))
        inForce.change(
          record(method.id),
          'inForce',
          lastInForce(method.id) ?? null,
          true,
        );
    }
    if (withdrawn.length) {
      const withdrawal = audit('methodWithdrawn');
      for (const id of withdrawn)
        withdrawal.change(record(id), 'inForce', true, false);
    }
  }
}
