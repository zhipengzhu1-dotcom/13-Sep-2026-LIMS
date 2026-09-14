import { people } from '../laboratory/contracts.ts';
import type { SeedAccount } from './accounts.ts';

/**
 * Prototype demo credentials: one account per person in `people`, so the lab
 * and sign-in never disagree about who exists. Fictional people; the
 * passwords are published here and on the sign-in screen, so these accounts
 * must never exist in a validated system.
 *
 * | Username      | Password            | Name          | Role        |
 * |---------------|---------------------|---------------|-------------|
 * | coordinator   | coordinator-demo    | Morgan Lee    | coordinator |
 * | analyst       | analyst-demo        | Alex Chen     | analyst     |
 * | analyst-2     | analyst-2-demo      | Sam Rivera    | analyst     |
 * | manager       | manager-demo        | Taylor Brooks | manager     |
 * | admin         | admin-demo          | Jordan Park   | admin       |
 */
export const demoAccounts: readonly SeedAccount[] = people.map((person) => ({
  ...person,
  password: `${person.id}-demo`,
}));
