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

/** Refuses the Quality lead any command, before anything about the command
 * or its record is looked at: they review the laboratory record and never
 * act on it (#67). */
export function refuseQualityLead(actor: Actor) {
  if (actsAs(actor, 'quality lead'))
    throw new WorkflowError(
      'The Quality lead reviews the laboratory record and runs no command.',
      403,
    );
}

/** Refuses an actor who acts in none of the given roles. An Admin acts in
 * every lab role (see `actsAs`). */
export function requireRole(actor: Actor, ...roles: [Role, ...Role[]]) {
  if (!roles.some((role) => actsAs(actor, role)))
    throw new WorkflowError(
      `This action requires the ${roles.join(' or ')} role.`,
      403,
    );
}
