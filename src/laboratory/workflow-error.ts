import { actsAs, type Actor, type Role } from './contracts.ts';

/** A refusal a person can act on, with the HTTP status the transport uses
 * and, where a caller acts on the kind of refusal, its code. */
export class WorkflowError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code?: 'accountLocked',
  ) {
    super(message);
  }
}

/** Refuses an actor who acts in none of the given roles. An Admin acts in
 * every role (see `actsAs`). */
export function requireRole(actor: Actor, ...roles: [Role, ...Role[]]) {
  if (!roles.some((role) => actsAs(actor, role)))
    throw new WorkflowError(
      `This action requires the ${roles.join(' or ')} role.`,
      403,
    );
}
