/**
 * What the instance's mode offers the workspace, from `GET /api/instance`.
 * Browser-safe, so the server derives it and the workspace reads it without
 * repeating the mode's rules.
 */
export type WorkspaceCapabilities = {
  /** The Demo badge and its not-validated notice in the status bar. */
  showsDemoBadge: boolean;
  /** The demo accounts and their published passwords on the sign-in screen. */
  listsDemoAccounts: boolean;
  /** The Admin's Accounts screen (ADR-0011). */
  offersAccountsScreen: boolean;
};

/** Until the server says otherwise, nothing demo-only is offered. */
export const nothingOffered: WorkspaceCapabilities = {
  showsDemoBadge: false,
  listsDemoAccounts: false,
  offersAccountsScreen: false,
};
