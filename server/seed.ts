import { existsSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { Laboratory } from '../src/laboratory/laboratory.ts';
import { demoAccounts } from '../src/accounts/demo-accounts.ts';
import {
  laboratoryDay,
  newCommandId,
  type SampleReceipt,
  type SubmissionReceipt,
} from '../src/laboratory/contracts.ts';
import { BASELINE_VERSION, userVersion } from './migrations.ts';

/**
 * A demo database written before versioned migrations carries no data worth
 * keeping and no migration can bring it up to date, so the development server
 * deletes it and starts on a fresh, reseeded file. Any later database is
 * migrated, never discarded.
 */
export function discardOutdatedDemoDatabase(file: string) {
  if (!existsSync(file)) return;
  const db = new DatabaseSync(file);
  const version = userVersion(db);
  db.close();
  if (version >= BASELINE_VERSION) return;
  for (const suffix of ['', '-wal', '-shm'])
    rmSync(file + suffix, { force: true });
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Demo signers re-enter their published demo password, as a person would. */
const passwordOf = (id: string) =>
  demoAccounts.find((a) => a.id === id)!.password;

type Stage =
  | 'held'
  | 'received'
  | 'progress'
  | 'awaiting'
  | 'returned'
  | 'approved'
  | 'published'
  | 'amended';
type SeedSample = SampleReceipt & {
  stage: Stage;
  values: number[];
  /** A Manager opens an OOS investigation on the first Test's Result. */
  openOos?: true;
  /** That investigation is concluded as a Confirmed OOS before Approval; a
   * published Sample also records that the Client was informed. */
  confirmOos?: true;
  /** That investigation finds a laboratory error and concludes the Result
   * Invalidated; the Manager returns the Sample, and the Analyst records a
   * Retest and submits again. */
  invalidateOos?: { findings: string; cause: string; retest: number };
  /** The Client's word on a Receipt deviation, recorded before any work. */
  instruction?: { decision: 'proceed' | 'withdraw'; contact: string };
  /** An amended Sample: once version 1 is Published, the first Test's
   * Result is corrected in an Amendment and version 2 is Published. */
  amendment?: { reason: string; value: number; correction: string };
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
      clientContact: {
        name: 'Priya Raman',
        role: 'Quality Assurance Lead',
        email: 'priya.raman@northstar.example',
        phone: '+1 555 0101',
      },
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
        {
          ...tablets,
          clientSampleId: 'NS-LOS-25-01',
          product: 'Losartan potassium tablets',
          strength: '25 mg',
          batch: 'LP-260805',
          manufacturer: 'Northstar Pharma, Site 2',
          manufactureDate: '2026-05-26',
          expiryDate: '2028-05-25',
          materialType: 'finished product',
          maximumDailyDose: 100,
          methodIds: ['NIT-001-v1', 'NIT-003-v1'],
          dueDate: due(-2),
          priority: 'Routine',
          stage: 'published',
          values: [1.9, 0.6],
        },
        {
          ...tablets,
          clientSampleId: 'NS-LOS-25-02',
          product: 'Losartan potassium tablets',
          strength: '25 mg',
          batch: 'LP-260806',
          manufacturer: 'Northstar Pharma, Site 2',
          manufactureDate: '2026-05-27',
          expiryDate: '2028-05-26',
          materialType: 'finished product',
          maximumDailyDose: 100,
          methodIds: ['NIT-001-v1', 'NIT-003-v1'],
          dueDate: due(-3),
          priority: 'Routine',
          stage: 'amended',
          values: [2.1, 0.7],
          amendment: {
            reason:
              'Client query: the NIT-001 Result on the Certificate does not match the calculation worksheet.',
            value: 12.1,
            correction:
              'Transcription error: the worksheet gives 12.1 ng/day; 2.1 was keyed in error.',
          },
        },
      ],
    },
    {
      clientId: 'meridian',
      clientReference: 'MT-REQ-0917',
      clientContact: {
        name: 'Marcus Hale',
        role: 'QC Release Manager',
        email: 'marcus.hale@meridian.example',
        phone: '+1 555 0102',
      },
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
      clientContact: {
        name: 'Elena Sorensen',
        role: 'Analytical Services Manager',
        email: 'elena.sorensen@aster.example',
        phone: '+1 555 0103',
      },
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
      clientContact: {
        name: 'Elena Sorensen',
        role: 'Analytical Services Manager',
        email: 'elena.sorensen@aster.example',
        phone: '+1 555 0103',
      },
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
      clientContact: {
        name: 'Jordan Okafor',
        role: 'Stability Programme Lead',
        email: 'jordan.okafor@formulation.example',
        phone: '+1 555 0104',
      },
      shippingCondition: 'ambient',
      packageCondition: 'intact',
      chainOfCustodyReference: 'COC-FD-014-6M',
      samples: [
        {
          ...tablets,
          quantity: { value: 60, unit: 'units' },
          containers: { count: 1, type: 'blister pack' },
          clientSampleId: 'STAB-014-ACC-6M',
          product: 'Rivaroxaban tablets',
          strength: '20 mg',
          batch: 'RV-260107',
          manufacturer: 'In-house pilot plant',
          manufactureDate: '2026-01-07',
          expiryDate: '2028-01-06',
          materialType: 'finished product',
          maximumDailyDose: 30,
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
      clientContact: {
        name: 'Grace Lindqvist',
        role: 'QC Laboratory Supervisor',
        email: 'grace.lindqvist@harbor.example',
        phone: '+1 555 0105',
      },
      courier: 'UPS',
      trackingNumber: '1Z-902-771-3304',
      shippingCondition: 'ambient',
      temperatureOnArrival: 22.1,
      packageCondition: 'intact',
      chainOfCustodyReference: 'COC-HH-2609',
      samples: [
        {
          ...tablets,
          clientSampleId: 'HH-OLM-40-01',
          product: 'Olmesartan medoxomil tablets',
          strength: '40 mg',
          batch: 'OL-260909',
          manufacturer: 'Harbor Health Products',
          manufactureDate: '2026-07-14',
          expiryDate: '2028-07-13',
          maximumDailyDose: 40,
          materialType: 'finished product',
          methodIds: ['NIT-001-v1', 'NIT-003-v1'],
          dueDate: due(5),
          priority: 'Urgent',
          stage: 'awaiting',
          // Impurity A over its illustrative 26.5 ng/day Limit.
          values: [31.4, 4.2],
          openOos: true,
        },
        {
          ...tablets,
          clientSampleId: 'HH-OLM-20-01',
          product: 'Olmesartan medoxomil tablets',
          strength: '20 mg',
          batch: 'OL-260902',
          manufacturer: 'Harbor Health Products',
          manufactureDate: '2026-07-07',
          expiryDate: '2028-07-06',
          maximumDailyDose: 40,
          materialType: 'finished product',
          methodIds: ['NIT-001-v1', 'NIT-003-v1'],
          dueDate: due(2),
          priority: 'Routine',
          // Approved with a Confirmed OOS: Publishing waits for the record
          // that the Client was informed.
          stage: 'approved',
          values: [28.7, 1.5],
          openOos: true,
          confirmOos: true,
        },
        {
          ...tablets,
          clientSampleId: 'HH-OLM-10-01',
          product: 'Olmesartan medoxomil tablets',
          strength: '10 mg',
          batch: 'OL-260895',
          manufacturer: 'Harbor Health Products',
          manufactureDate: '2026-06-30',
          expiryDate: '2028-06-29',
          maximumDailyDose: 40,
          materialType: 'finished product',
          methodIds: ['NIT-001-v1', 'NIT-003-v1'],
          dueDate: due(3),
          priority: 'Routine',
          // Invalidated for a laboratory error and retested: the Test sheet
          // shows the Retest's lineage, awaiting Approval.
          stage: 'awaiting',
          values: [31.2, 1.8],
          openOos: true,
          invalidateOos: {
            findings:
              'Standard preparation log shows the working standard was diluted twice.',
            cause:
              'Working standard diluted twice (preparation log p. 14); the reading was low against it.',
            retest: 12.4,
          },
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
            confirmOos: _c,
            invalidateOos: _x,
            instruction: _i,
            amendment: _a,
            ...sample
          }) => sample,
        ),
      },
      'coordinator',
    );
    receipt.samples.forEach((received, i) => {
      const {
        stage,
        values,
        openOos,
        confirmOos,
        invalidateOos,
        instruction,
        amendment,
      } = samples[i];
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
      const entry = (j: number, value: number, run: number, reason = '') => {
        const t = s.tests[j];
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
            analysedOn: laboratoryDay(new Date().toISOString()),
            attachmentId: worksheet.id,
            reason,
          },
          'analyst',
        );
      };
      values.forEach((value, j) => {
        if (stage === 'awaiting' && j === 0 && !openOos) {
          // One corrected Result, so the demo shows a superseded entry.
          entry(j, value - 0.5, 1);
          entry(j, value, 2, 'Wrong injection selected; re-read sequence.');
        } else entry(j, value, 1);
      });
      if (stage === 'progress') return;
      act(
        { type: 'submitForApproval', password: passwordOf('analyst') },
        'analyst',
      );
      // Left open, unless confirmed: the Analyst's laboratory error check
      // comes next.
      if (openOos)
        act({ type: 'openOosInvestigation', testId: s.tests[0].id }, 'manager');
      const investigationId = s.investigations[0]?.id;
      if (confirmOos) {
        act(
          {
            type: 'recordLabErrorCheck',
            investigationId,
            findings:
              'Calculations, standard preparation, system suitability and sample preparation checked; no laboratory error found.',
            errorIdentified: false,
          },
          'analyst',
        );
        act(
          {
            type: 'concludeOosInvestigation',
            investigationId,
            outcome: 'Confirmed',
            assignableCause: '',
            causationConfirmed: false,
          },
          'manager',
        );
      }
      if (invalidateOos) {
        act(
          {
            type: 'recordLabErrorCheck',
            investigationId,
            findings: invalidateOos.findings,
            errorIdentified: true,
          },
          'analyst',
        );
        act(
          {
            type: 'concludeOosInvestigation',
            investigationId,
            outcome: 'Invalidated',
            assignableCause: invalidateOos.cause,
            causationConfirmed: true,
          },
          'manager',
        );
        act(
          {
            type: 'return',
            comment: `Retest ${s.tests[0].methodCode} per ${investigationId}.`,
          },
          'manager',
        );
        // The Retest needs no reason of its own; it records the investigation
        // it follows.
        entry(0, invalidateOos.retest, 2);
        act(
          { type: 'submitForApproval', password: passwordOf('analyst') },
          'analyst',
        );
      }
      const published = stage === 'published' || stage === 'amended';
      const publish = () =>
        act(
          {
            type: 'publish',
            recipients: ['Dana Whitfield, QA Release, Northstar Pharma'],
            channel: 'email',
            channelDetail: 'qa-release@northstar.example',
            publishedAt: new Date().toISOString(),
          },
          'coordinator',
        );
      if (stage === 'approved' || published)
        act({ type: 'approve', password: passwordOf('manager') }, 'manager');
      if (published) {
        if (confirmOos)
          act(
            {
              type: 'recordClientOosNotification',
              investigationId,
              contact: 'Client QA contact (phone)',
              sent: `${investigationId} data, calculation worksheet and Laboratory error check findings, by email.`,
              notifiedAt: new Date().toISOString(),
            },
            'coordinator',
          );
        publish();
      }
      if (amendment) {
        // Version 1 stays on file, superseded once version 2 is Published.
        act(
          { type: 'startAmendment', reason: amendment.reason },
          'coordinator',
        );
        entry(0, amendment.value, 2, amendment.correction);
        act(
          { type: 'submitForApproval', password: passwordOf('analyst') },
          'analyst',
        );
        act({ type: 'approve', password: passwordOf('manager') }, 'manager');
        publish();
      }
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
