import { existsSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  SCHEMA_VERSION,
  type Laboratory,
} from '../src/laboratory/laboratory.ts';
import { demoAccounts } from '../src/accounts/demo-accounts.ts';
import {
  newCommandId,
  type SampleReceipt,
} from '../src/laboratory/contracts.ts';

/**
 * The demo database carries no data worth keeping. One written for an older
 * schema is deleted, so the server starts on a fresh, reseeded file instead of
 * mixing the old model's rows into the new one.
 */
export function discardOutdatedDemoDatabase(file: string) {
  if (!existsSync(file)) return;
  const db = new DatabaseSync(file);
  const { user_version: version } = db.prepare('PRAGMA user_version').get() as {
    user_version: number;
  };
  db.close();
  if (version >= SCHEMA_VERSION) return;
  for (const suffix of ['', '-wal', '-shm'])
    rmSync(file + suffix, { force: true });
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Demo signers re-enter their published demo password, as a person would. */
const passwordOf = (id: string) =>
  demoAccounts.find((a) => a.id === id)!.password;

type Stage = 'received' | 'progress' | 'awaiting' | 'returned' | 'approved';

/** Drives the public command seam, so demo records carry a real audit trail
 * and real Electronic signatures. */
export function seed(lab: Laboratory) {
  if (lab.snapshot().submissions.length) return;
  const due = (days: number) =>
    new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  const submissions: {
    client: string;
    samples: (SampleReceipt & {
      stage: Stage;
      values: number[];
      /** A Manager opens an OOS investigation on the first Test's Result. */
      openOos?: true;
    })[];
  }[] = [
    {
      client: 'Northstar Pharma',
      samples: [
        {
          product: 'Losartan potassium tablets 50 mg',
          batch: 'LP-260811',
          materialType: 'finished product',
          methodIds: ['NIT-001-v1', 'NIT-003-v1'],
          dueDate: due(4),
          priority: 'Routine',
          stage: 'approved',
          values: [2.4, 0.8],
        },
        {
          product: 'Losartan potassium tablets 100 mg',
          batch: 'LP-260812',
          materialType: 'finished product',
          methodIds: ['NIT-001-v1', 'NIT-003-v1'],
          dueDate: due(1),
          priority: 'Urgent',
          stage: 'awaiting',
          values: [3.1, 12.6],
        },
      ],
    },
    {
      client: 'Meridian Therapeutics',
      samples: [
        {
          product: 'Metformin hydrochloride · API',
          batch: 'MF-260802',
          materialType: 'raw material',
          methodIds: ['NIT-002-v1', 'NIT-005-v1'],
          dueDate: due(3),
          priority: 'Routine',
          stage: 'progress',
          values: [0.02],
        },
        {
          product: 'Valsartan · API',
          batch: 'VS-260830',
          materialType: 'raw material',
          methodIds: ['NIT-004-v1'],
          dueDate: due(6),
          priority: 'Routine',
          stage: 'returned',
          values: [0.05],
        },
      ],
    },
    {
      client: 'Aster Laboratories',
      samples: [
        {
          product: 'Sitagliptin tablets 100 mg',
          batch: 'SG-260905',
          materialType: 'finished product',
          methodIds: ['NIT-001-v1', 'NIT-004-v1', 'NIT-005-v1'],
          dueDate: due(0),
          priority: 'Urgent',
          stage: 'received',
          values: [],
        },
        {
          product: 'Ranolazine extended-release tablets 500 mg',
          batch: 'RN-260907',
          materialType: 'finished product',
          methodIds: ['NIT-002-v1'],
          dueDate: due(8),
          priority: 'Routine',
          stage: 'received',
          values: [],
        },
      ],
    },
    {
      client: 'Harbor Health Products',
      samples: [
        {
          product: 'Irbesartan tablets 300 mg',
          batch: 'IR-260909',
          materialType: 'finished product',
          methodIds: ['NIT-001-v1', 'NIT-003-v1'],
          dueDate: due(5),
          priority: 'Urgent',
          stage: 'awaiting',
          // Impurity A over its illustrative 26.5 ng/day Limit.
          values: [31.4, 4.2],
          openOos: true,
        },
      ],
    },
  ];
  for (const { client, samples } of submissions) {
    const receipt = lab.execute(
      {
        commandId: newCommandId(),
        type: 'receiveSubmission',
        client,
        samples: samples.map(
          ({ stage: _s, values: _v, openOos: _o, ...sample }) => sample,
        ),
      },
      'coordinator',
    );
    receipt.samples.forEach((received, i) => {
      const { stage, values, openOos } = samples[i];
      if (stage === 'received') return;
      let s = received;
      const act = (command: object, actor: string) => {
        s = lab.execute(
          {
            commandId: newCommandId(),
            sampleId: s.id,
            revision: s.revision,
            ...command,
          },
          actor,
        ).samples[0];
      };
      act({ type: 'assign', assignee: 'analyst' }, 'coordinator');
      s.tests.forEach((t, j) => {
        if (j >= values.length) return;
        const entry = (value: number, run: number, reason = '') =>
          act(
            {
              type: 'enterResult',
              testId: t.id,
              value,
              // Illustrative only: the analyst converts ng/mL by hand.
              instrumentReading: Math.round(value * 1000) / 100,
              sequenceId: `SEQ-${s.id}-${pad(j + 1)}-${run}`,
              reason,
            },
            'analyst',
          );
        if (stage === 'awaiting' && j === 0 && !openOos) {
          // One corrected Result, so the demo shows a superseded entry.
          entry(values[j] - 0.5, 1);
          entry(values[j], 2, 'Wrong injection selected; re-read sequence.');
        } else entry(values[j], 1);
      });
      if (stage === 'progress') return;
      act(
        { type: 'submitForApproval', password: passwordOf('analyst') },
        'analyst',
      );
      // Left open: the Analyst's laboratory error check comes next.
      if (openOos)
        act({ type: 'openOosInvestigation', testId: s.tests[0].id }, 'manager');
      if (stage === 'approved')
        act({ type: 'approve', password: passwordOf('manager') }, 'manager');
      if (stage === 'returned')
        act(
          {
            type: 'return',
            comment:
              'Check the dilution used for the NIT-004 Result against the worksheet.',
          },
          'manager',
        );
    });
  }
}
