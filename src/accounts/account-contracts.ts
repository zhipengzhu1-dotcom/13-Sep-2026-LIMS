/**
 * What the Admin's account screen sends and receives. Browser-safe, so the
 * workspace and the accounts store validate against the same rules.
 */
import { z } from 'zod';
import { roles, type Role } from '../laboratory/contracts.ts';

const username = z
  .string()
  .regex(
    /^[a-z0-9][a-z0-9-]{1,39}$/,
    'A username is 2 to 40 lowercase letters, digits or hyphens, starting with a letter or digit.',
  );
const name = z
  .string()
  .trim()
  .min(1, 'Enter the printed name.')
  .max(80, 'A printed name is at most 80 characters.');
const role = z.enum(roles, { error: 'Select a role.' });
const password = z
  .string()
  .min(12, 'A password needs at least 12 characters.')
  .max(200, 'A password is at most 200 characters.');

/** A password a user or the Admin chooses (SOP-Management#19). */
export const ownPasswordSchema = password;

export const accountCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('addAccount'), username, name, role, password }),
  z.object({
    type: z.literal('updateAccount'),
    username: z.string(),
    name: name.optional(),
    role: role.optional(),
    active: z.boolean().optional(),
  }),
  z.object({ type: z.literal('setPassword'), username: z.string(), password }),
  z.object({ type: z.literal('unlockAccount'), username: z.string() }),
]);
export type AccountCommand = z.infer<typeof accountCommandSchema>;

/** An account the System administrator issues; it has no password until
 * Benchline generates its One-time password. */
export const issuedAccountSchema = z.object({ username, name, role });

/** The refusal for a change that would leave no active Admin. */
export const NO_ACTIVE_ADMIN_LEFT =
  'Benchline needs at least one active Admin.';

/** Whether changing one account's role or active flag would leave Benchline
 * with no active, unlocked Admin to manage accounts. The store refuses such a
 * change, and the Accounts screen blocks it before it is tried. */
export function leavesNoActiveAdmin(
  accounts: readonly AccountSummary[],
  username: string,
  after: Partial<Pick<AccountSummary, 'role' | 'active'>>,
): boolean {
  return !accounts
    .map((a) => (a.id === username ? { ...a, ...after } : a))
    .some((a) => a.role === 'admin' && a.active && !a.locked);
}

/** An account as the Admin's screen lists it. Never a password hash. */
export type AccountSummary = {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  locked: boolean;
  /** Consecutive Failed attempts since the last success. */
  failedAttempts: number;
};
