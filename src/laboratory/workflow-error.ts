import type { Actor, Role } from './contracts.ts';

/** A refusal a person can act on, with the HTTP status the transport uses. */
export class WorkflowError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** Refuses an actor who holds none of the given roles. */
export function requireRole(actor: Actor, ...roles: [Role, ...Role[]]) {
  if (!roles.includes(actor.role))
    throw new WorkflowError(
      `This action requires the ${roles.join(' or ')} role.`,
      403,
    );
}
