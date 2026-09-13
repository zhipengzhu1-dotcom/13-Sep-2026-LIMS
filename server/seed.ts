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
  type SubmissionReceipt,
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

type Stage =
  'held' | 'received' | 'progress' | 'awaiting' | 'returned' | 'approved';
type SeedSample = SampleReceipt & {
  stage: Stage;
  values: number[];
  /** A Manager opens an OOS investigation on the first Test's Result. */
  openOos?: true;
  /** The Client's word on a Receipt deviation, recorded before any work. */
  instruction?: { decision: 'proceed' | 'withdraw'; contact: string };
};
type SeedSubmission = Omit<
  SubmissionReceipt,
  'commandId' | 'type' | 'samples'
> & { samples: SeedSample[] };

/** Drives the public command seam, so demo records carry a real audit trail
 * and real Electronic signatures. */
export function seed(lab: Laboratory) {
  if (lab.snapshot().submissions.length) return;
  const due = (days: number) =>
    new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  const tablets = {
    quantity: { value: 120, unit: 'units' },
    containers: { count: 2, type: 'bottle' },
    conditionOnReceipt: 'Intact, seals unbroken',
    storageCondition: 'Room temperature, 15–25 °C',
    storageLocation: 'Sample store R2, shelf 3',
    retentionInstruction: 'Retain 12 months after publishing, then destroy',
  } as const;
  const api = {
    quantity: { value: 25, unit: 'g' },
    containers: { count: 1, type: 'jar' },
    conditionOnReceipt: 'Intact, double-bagged',
    storageCondition: 'Room temperature, 15–25 °C',
    storageLocation: 'Sample store R1, shelf 1',
    retentionInstruction: 'Return unused material to the Client',
  } as const;
  const submissions: SeedSubmission[] = [
    {
      clientId: 'northstar',
      clientReference: 'PO-448120',
      courier: 'World Courier',
      trackingNumber: 'WC-7731-0042',
      shippingCondition: 'ambient',
      temperatureOnArrival: 21.4,
      packageCondition: 'intact',
      chainOfCustodyReference: 'COC-NS-2609',
      samples: [
        {
          ...tablets,
          clientSampleId: 'NS-LOS-50-01',
          product: 'Losartan potassium tablets',
          strength: '50 mg',
          batch: 'LP-260811',
          manufacturer: 'Northstar Pharma, Site 2',
          manufactureDate: '2026-06-02',
          expiryDate: '2028-06-01',
          materialType: 'finished product',
          maximumDailyDose: 100,
          methodIds: ['NIT-001-v1', 'NIT-003-v1'],
          dueDate: due(4),
          priority: 'Routine',
          stage: 'approved',
          values: [2.4, 0.8],
        },
        {
          ...tablets,
          clientSampleId: 'NS-LOS-100-01',
          product: 'Losartan potassium tablets',
          strength: '100 mg',
          batch: 'LP-260812',
          manufacturer: 'Northstar Pharma, Site 2',
          manufactureDate: '2026-06-09',
          expiryDate: '2028-06-08',
          materialType: 'finished product',
          maximumDailyDose: 100,
          methodIds: ['NIT-001-v1', 'NIT-003-v1'],
          dueDate: due(1),
          priority: 'Urgent',
          stage: 'awaiting',
          values: [3.1, 12.6],
        },
      ],
    },
    {
      clientId: 'meridian',
      clientReference: 'MT-REQ-0917',
      courier: 'DHL Express',
      trackingNumber: '1Z-448-221-907',
      shippingCondition: 'refrigerated',
      temperatureOnArrival: 5.8,
      packageCondition: 'intact',
      chainOfCustodyReference: 'COC-MT-0917',
      // Logged after the delivery was unpacked, so the arrival time is
      // corrected with a reason rather than left at the time of saving.
      receivedAt: {
        at: new Date(Date.now() - 3 * 3600000).toISOString(),
        reason:
          'Delivered before the morning instrument run; logged once unpacked.',
      },
      samples: [
        {
          ...api,
          clientSampleId: 'MF-API-02',
          product: 'Metformin hydrochloride · API',
          batch: 'MF-260802',
          manufacturer: 'Meridian Therapeutics',
          expiryDate: '2029-08-01',
          expiryKind: 'retest',
          materialType: 'raw material',
          methodIds: ['NIT-002-v1', 'NIT-005-v1'],
          dueDate: due(3),
          priority: 'Routine',
          stage: 'progress',
          values: [0.02],
        },
        {
          ...api,
          clientSampleId: 'VS-API-30',
          product: 'Valsartan · API',
          batch: 'VS-260830',
          manufacturer: 'Meridian Therapeutics',
          materialType: 'raw material',
          storageCondition: 'Refrigerated, 2–8 °C',
          storageLocation: 'Fridge F1',
          methodIds: ['NIT-004-v1'],
          dueDate: due(6),
          priority: 'Routine',
          stage: 'returned',
          values: [0.05],
        },
      ],
    },
    {
      clientId: 'aster',
      clientReference: 'AL-2026-311',
      courier: 'FedEx',
      trackingNumber: '7489 2231 0045',
      shippingCondition: 'ambient',
      packageCondition: 'intact',
      chainOfCustodyReference: 'COC-AL-311',
      samples: [
        {
          ...tablets,
          product: 'Sitagliptin tablets',
          strength: '100 mg',
          batch: 'SG-260905',
          materialType: 'finished product',
          maximumDailyDose: 100,
          methodIds: ['NIT-001-v1', 'NIT-004-v1', 'NIT-005-v1'],
          dueDate: due(0),
          priority: 'Urgent',
          remarks: 'Client asks for a verbal update once Results are approved.',
          stage: 'received',
          values: [],
        },
      ],
    },
    {
      clientId: 'aster',
      clientReference: 'AL-2026-318',
      courier: 'UPS',
      trackingNumber: '1Z-99A-331-0418',
      shippingCondition: 'refrigerated',
      temperatureOnArrival: 14.2,
      packageCondition: 'damaged',
      chainOfCustodyReference: 'COC-AL-318',
      samples: [
        {
          ...tablets,
          clientSampleId: 'AL-AML-05-02',
          product: 'Amlodipine besylate tablets',
          strength: '5 mg',
          batch: 'AM-260821',
          manufacturer: 'Aster Laboratories',
          materialType: 'finished product',
          maximumDailyDose: 10,
          conditionOnReceipt: 'Outer carton crushed; one bottle seal broken',
          methodIds: ['NIT-001-v1', 'NIT-003-v1'],
          dueDate: due(5),
          priority: 'Routine',
          deviations: [
            {
              kind: 'broken seal',
              description:
                'Induction seal on bottle 2 of 2 broken; tablets loose in the carton.',
            },
            {
              kind: 'temperature excursion',
              description:
                'Shipped refrigerated, 14.2 °C on arrival; no data logger in the box.',
            },
          ],
          stage: 'held',
          values: [],
        },
        {
          ...tablets,
          clientSampleId: 'AL-AML-10-02',
          product: 'Amlodipine besylate tablets',
          strength: '10 mg',
          batch: 'AM-260822',
          manufacturer: 'Aster Laboratories',
          materialType: 'finished product',
          maximumDailyDose: 10,
          conditionOnReceipt: 'Outer carton crushed; bottles intact',
          methodIds: ['NIT-001-v1'],
          dueDate: due(5),
          priority: 'Routine',
          deviations: [
            {
              kind: 'damaged package',
              description:
                'Outer carton crushed in transit; inner bottles and seals intact.',
            },
          ],
          instruction: {
            decision: 'proceed',
            contact: 'Priya Nair, QA Aster Laboratories (phone)',
          },
          stage: 'received',
          values: [],
        },
      ],
    },
    {
      clientId: 'formulation-development',
      clientReference: 'FD-STAB-014',
      shippingCondition: 'ambient',
      packageCondition: 'intact',
      chainOfCustodyReference: 'COC-FD-014-6M',
      samples: [
        {
          ...tablets,
          quantity: { value: 60, unit: 'units' },
          containers: { count: 1, type: 'blister pack' },
          clientSampleId: 'STAB-014-ACC-6M',
          product: 'Ranolazine extended-release tablets',
          strength: '500 mg',
          batch: 'RN-260107',
          manufacturer: 'In-house pilot plant',
          manufactureDate: '2026-01-07',
          expiryDate: '2028-01-06',
          materialType: 'finished product',
          maximumDailyDose: 2000,
          stability: {
            studyId: 'STAB-014',
            timePoint: '6M',
            condition: 'ACC',
          },
          methodIds: ['NIT-002-v1'],
          dueDate: due(8),
          priority: 'Routine',
          stage: 'received',
          values: [],
        },
      ],
    },
    {
      clientId: 'harbor',
      clientReference: 'HH-QC-2609',
      courier: 'UPS',
      trackingNumber: '1Z-902-771-3304',
      shippingCondition: 'ambient',
      temperatureOnArrival: 22.1,
      packageCondition: 'intact',
      chainOfCustodyReference: 'COC-HH-2609',
      samples: [
        {
          ...tablets,
          clientSampleId: 'HH-IRB-300-01',
          product: 'Irbesartan tablets',
          strength: '300 mg',
          batch: 'IR-260909',
          manufacturer: 'Harbor Health Products',
          manufactureDate: '2026-07-14',
          expiryDate: '2028-07-13',
          maximumDailyDose: 300,
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
  for (const { samples, ...submission } of submissions) {
    const receipt = lab.execute(
      {
        commandId: newCommandId(),
        type: 'receiveSubmission',
        ...submission,
        samples: samples.map(
          ({
            stage: _s,
            values: _v,
            openOos: _o,
            instruction: _i,
            ...sample
          }) => sample,
        ),
      },
      'coordinator',
    );
    receipt.samples.forEach((received, i) => {
      const { stage, values, openOos, instruction } = samples[i];
      if (instruction)
        received = lab.execute(
          {
            commandId: newCommandId(),
            type: 'recordClientInstruction',
            sampleId: received.id,
            revision: received.revision,
            ...instruction,
            instructedAt: new Date(Date.now() - 3600000).toISOString(),
          },
          'coordinator',
        ).samples[0];
      if (stage === 'received' || stage === 'held') return;
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
        const entry = (value: number, run: number, reason = '') => {
          // Illustrative only: the analyst converts ng/mL by hand.
          const instrumentReading = Math.round(value * 1000) / 100;
          const sequenceId = `SEQ-${s.id}-${pad(j + 1)}-${run}`;
          const worksheet = lab.storeAttachment(
            {
              filename: `${s.id} ${t.methodCode} worksheet ${run}.csv`,
              contentType: 'text/csv',
              content: Buffer.from(
                `Sample,Method,Sequence ID,Instrument reading (ng/mL),Result (${t.unit})\n${s.id},${t.methodCode},${sequenceId},${instrumentReading},${value}\n`,
              ),
            },
            'analyst',
          );
          act(
            {
              type: 'enterResult',
              testId: t.id,
              value,
              instrumentReading,
              sequenceId,
              attachmentId: worksheet.id,
              reason,
            },
            'analyst',
          );
        };
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
