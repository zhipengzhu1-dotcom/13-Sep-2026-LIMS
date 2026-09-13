import type { Laboratory } from '../src/laboratory/laboratory.ts';
import { newCommandId } from '../src/laboratory/contracts.ts';

export function seed(lab: Laboratory) {
  if (lab.snapshot().samples.length) return;
  const due = (days: number) =>
    new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  const entries = [
    [
      'Acetaminophen tablets 500 mg',
      'Northstar Pharma',
      'AC-260901',
      1,
      'Urgent',
      'review',
    ],
    [
      'Metformin HCl · API',
      'Meridian Therapeutics',
      'MF-260812',
      3,
      'Routine',
      'progress',
    ],
    [
      'Ibuprofen tablets 200 mg',
      'Northstar Pharma',
      'IB-260905',
      2,
      'Routine',
      'received',
    ],
    [
      'Caffeine · reference material',
      'Aster Laboratories',
      'CF-260822',
      0,
      'Urgent',
      'exception',
    ],
    [
      'Ascorbic acid · raw material',
      'Meridian Therapeutics',
      'AA-260902',
      4,
      'Routine',
      'approved',
    ],
  ] as const;
  for (const [product, client, batch, days, priority, stage] of entries) {
    let { sample: s } = lab.execute(
      {
        commandId: newCommandId(),
        type: 'receive',
        product,
        client,
        batch,
        dueDate: due(days),
        priority,
        notes:
          'Fictional demonstration sample. Specifications are illustrative only.',
        methodIds: ['assay', 'water', 'impurity'],
      },
      'coordinator',
    );
    if (stage === 'received') continue;
    ({ sample: s } = lab.execute(
      {
        commandId: newCommandId(),
        type: 'assign',
        sampleId: s.id,
        revision: s.revision,
        assignee: 'analyst',
      },
      'coordinator',
    ));
    for (const [testId, value] of [
      ['assay', stage === 'exception' ? 96.7 : 99.8],
      ['water', 0.18],
      ['impurity', 0.12],
    ] as const) {
      ({ sample: s } = lab.execute(
        {
          commandId: newCommandId(),
          type: 'record',
          sampleId: s.id,
          revision: s.revision,
          testId,
          value,
          reference: 'DEMO-RUN-0910',
          reason: '',
        },
        'analyst',
      ));
      if (stage === 'progress') break;
    }
    if (stage === 'progress') continue;
    ({ sample: s } = lab.execute(
      {
        commandId: newCommandId(),
        type: 'submit',
        sampleId: s.id,
        revision: s.revision,
      },
      'analyst',
    ));
    if (stage === 'approved')
      lab.execute(
        {
          commandId: newCommandId(),
          type: 'review',
          sampleId: s.id,
          revision: s.revision,
          decision: 'approve',
          comment:
            'Demo review completed; all illustrative specifications met.',
        },
        'reviewer',
      );
  }
}
