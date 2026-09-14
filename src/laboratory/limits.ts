import { z } from 'zod';
import type { LodLoq, Qualifier } from './contracts.ts';

/**
 * Limits and Conformity statements. Pure and browser-safe: the core judges
 * each Result with these functions when it is entered, and the workspace uses
 * the same ones to preview a Conformity statement and to show which entry is in force.
 */

export const cderSource = {
  sourceTitle: 'CDER Nitrosamine Impurity Acceptable Intake Limits',
  sourceUrl:
    'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cder-nitrosamine-impurity-acceptable-intake-limits',
} as const;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Enter a valid date.');

/** The recommended Acceptable intake, in ng/day, FDA's Carcinogenic Potency
 * Categorization Approach (CPCA) predicts for each Potency category. */
export const cpcaPredictedValues = {
  1: 26.5,
  2: 100,
  3: 400,
  4: 1500,
  5: 1500,
} as const;

export const potencyCategorySchema = z.union(
  [z.literal([1, 2, 3, 4, 5]), z.literal('not categorised')],
  { error: 'Give the potency category: 1 to 5, or not categorised.' },
);
export type PotencyCategory = z.infer<typeof potencyCategorySchema>;

export const limitTypeSchema = z.enum(
  ['CPCA-predicted', 'compound-specific', 'interim'],
  {
    error: 'Give the limit type: CPCA-predicted, compound-specific or interim.',
  },
);
export type LimitType = z.infer<typeof limitTypeSchema>;

/** A new Acceptable intake entry as it is appended; the core assigns its id. */
export const acceptableIntakeEntrySchema = z.object({
  analyteId: z.string().trim().min(1).max(200),
  /** ng/day, written as published: its decimal places set the rounding. */
  value: z.number().finite().positive(),
  potencyCategory: potencyCategorySchema,
  limitType: limitTypeSchema,
  sourceTitle: z.string().trim().min(1).max(200),
  sourceUrl: z.url().max(500),
  sourceRevisionDate: isoDate,
  /** The first calendar day (UTC) on which the entry is in force. */
  effectiveFrom: isoDate,
  illustrative: z.boolean(),
});
export type AcceptableIntakeEntry = z.infer<typeof acceptableIntakeEntrySchema>;

/**
 * One append-only Acceptable intake entry. A changed Acceptable intake is a new
 * entry with a later `effectiveFrom`; no entry is ever edited or removed. An
 * entry appended before Potency categories and Limit types were recorded has
 * null for both.
 */
export type AcceptableIntake = Omit<
  AcceptableIntakeEntry,
  'potencyCategory' | 'limitType'
> & {
  /** Append order, starting at 1. */
  id: number;
  potencyCategory: PotencyCategory | null;
  limitType: LimitType | null;
};

/**
 * Why an entry's Potency category and Limit type can't stand together, or
 * null if they can: a CPCA-predicted limit is its category's predicted value.
 */
export function potencyRefusal({
  value,
  potencyCategory,
  limitType,
}: Pick<AcceptableIntakeEntry, 'value' | 'potencyCategory' | 'limitType'>):
  string | null {
  if (limitType !== 'CPCA-predicted') return null;
  if (potencyCategory === 'not categorised')
    return 'A CPCA-predicted limit needs its potency category.';
  const predicted = cpcaPredictedValues[potencyCategory];
  return value === predicted
    ? null
    : `A CPCA-predicted limit for potency category ${potencyCategory} is ${predicted} ng/day.`;
}

/**
 * Illustrative placeholders, to be replaced with values checked against the
 * CDER list before validation. Impurity B carries an earlier entry so the
 * history is visible.
 */
export const seededAcceptableIntakes: readonly AcceptableIntakeEntry[] = [
  {
    analyteId: 'impurity-a',
    value: 26.5,
    potencyCategory: 1,
    limitType: 'CPCA-predicted',
    ...cderSource,
    sourceRevisionDate: '2023-08-04',
    effectiveFrom: '2023-08-04',
    illustrative: true,
  },
  {
    analyteId: 'impurity-b',
    value: 26.5,
    potencyCategory: 1,
    limitType: 'CPCA-predicted',
    ...cderSource,
    sourceRevisionDate: '2023-08-04',
    effectiveFrom: '2023-08-04',
    illustrative: true,
  },
  {
    analyteId: 'impurity-b',
    value: 96,
    potencyCategory: 'not categorised',
    limitType: 'interim',
    ...cderSource,
    sourceRevisionDate: '2025-06-23',
    effectiveFrom: '2025-07-01',
    illustrative: true,
  },
  {
    analyteId: 'impurity-c',
    value: 1500,
    potencyCategory: 4,
    limitType: 'CPCA-predicted',
    ...cderSource,
    sourceRevisionDate: '2023-08-04',
    effectiveFrom: '2023-08-04',
    illustrative: true,
  },
];

/**
 * The entry for an Analyte in force at `at` (an ISO date or timestamp): the
 * latest `effectiveFrom` on or before that day, and of equal dates the one
 * appended last.
 */
export function limitInForce(
  entries: readonly AcceptableIntake[],
  analyteId: string,
  at: string,
): AcceptableIntake | null {
  const day = at.slice(0, 10);
  let found: AcceptableIntake | null = null;
  for (const e of entries) {
    if (e.analyteId !== analyteId || e.effectiveFrom > day) continue;
    if (
      !found ||
      e.effectiveFrom > found.effectiveFrom ||
      (e.effectiveFrom === found.effectiveFrom && e.id > found.id)
    )
      found = e;
  }
  return found;
}

/** Decimal places a number is written with: 26.5 → 1, 96 → 0, 1500 → 0. */
export function decimalPlaces(n: number): number {
  const [mantissa, exponent = '0'] = String(n).split('e');
  const fraction = mantissa.split('.')[1]?.length ?? 0;
  return Math.max(0, fraction - Number(exponent));
}

/**
 * `value` rounded half-up to `places`, as an integer count of 10^-places, so
 * the comparison with the Limit is exact. Scaling by exponent notation avoids
 * binary error: 1.005 at 2 places is 101, not 100.
 */
function scaled(value: number, places: number): number {
  const text = String(value);
  return text.includes('e')
    ? Math.round(value * 10 ** places)
    : Math.round(Number(`${text}e${places}`));
}

export type ConformityStatement = 'Complies' | 'Does not comply' | 'Report';

export const decisionRule =
  'The Result is rounded to the decimal places of the Limit and complies when it is at or below the Limit. A Result reported as < LOD or < LOQ complies when that LOD or LOQ is below the Limit. Each Result is judged on its own.';

/**
 * The Conformity statement for one Result. With no Limit (raw materials) it is
 * `Report`. A `< LOD` or `< LOQ` Result complies only when that LOD or LOQ is
 * strictly below the Limit; a quantified Result complies when, rounded to the
 * Limit's decimal places, it is at or below the Limit.
 */
export function conformity(
  result: { value: number; qualifier: Qualifier },
  { lod, loq }: LodLoq,
  limit: { value: number } | null,
): ConformityStatement {
  if (!limit) return 'Report';
  if (result.qualifier === '< LOD')
    return lod < limit.value ? 'Complies' : 'Does not comply';
  if (result.qualifier === '< LOQ')
    return loq < limit.value ? 'Complies' : 'Does not comply';
  const places = decimalPlaces(limit.value);
  return scaled(result.value, places) <= scaled(limit.value, places)
    ? 'Complies'
    : 'Does not comply';
}
