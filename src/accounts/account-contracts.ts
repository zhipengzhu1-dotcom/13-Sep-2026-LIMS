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
  .min(8, 'A password needs at least 8 characters.')
  .max(200, 'A password is at most 200 characters.');

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
