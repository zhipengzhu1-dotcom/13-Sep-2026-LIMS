import type { SeedAccount } from './accounts.ts';

/**
 * Prototype demo credentials. Fictional people; the passwords are published
 * here and on the sign-in screen, so these accounts must never exist in a
 * validated system.
 *
 * | Username      | Password            | Name          | Role        |
 * |---------------|---------------------|---------------|-------------|
 * | coordinator   | coordinator-demo    | Morgan Lee    | coordinator |
 * | analyst       | analyst-demo        | Alex Chen     | analyst     |
 * | analyst-2     | analyst-2-demo      | Sam Rivera    | analyst     |
 * | reviewer      | reviewer-demo       | Taylor Brooks | reviewer    |
 */
export const demoAccounts: readonly SeedAccount[] = [
  {
    id: 'coordinator',
    name: 'Morgan Lee',
    role: 'coordinator',
    password: 'coordinator-demo',
  },
  {
    id: 'analyst',
    name: 'Alex Chen',
    role: 'analyst',
    password: 'analyst-demo',
  },
  {
    id: 'analyst-2',
    name: 'Sam Rivera',
    role: 'analyst',
    password: 'analyst-2-demo',
  },
  {
    id: 'reviewer',
    name: 'Taylor Brooks',
    role: 'reviewer',
    password: 'reviewer-demo',
  },
];
