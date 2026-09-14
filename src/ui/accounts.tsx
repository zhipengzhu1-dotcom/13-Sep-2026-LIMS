import { useEffect, useId, useState } from 'react';
import { roles, type Role } from '../laboratory/contracts';
import {
  leavesNoActiveAdmin,
  NO_ACTIVE_ADMIN_LEFT,
  type AccountCommand,
  type AccountSummary,
} from '../accounts/account-contracts';

const ROLE_LABELS: Record<Role, string> = {
  coordinator: 'Coordinator',
  analyst: 'Analyst',
  manager: 'Manager',
  admin: 'Admin',
  'quality lead': 'Quality lead',
};

/** Sends one account change; resolves to every account, or rejects with the
 * server's refusal word for word. */
async function send(command: AccountCommand): Promise<AccountSummary[]> {
  const response = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.error ?? 'The account change could not be saved.');
  return body.accounts;
}

/** Saves a change, returning the refusal to show beside its form, or null. */
type Apply = (command: AccountCommand, saved: string) => Promise<string | null>;

/**
 * The Admin's Accounts screen, before Go-live only (ADR-0011): add users,
 * change a printed name or role, deactivate or reactivate, set a password and
 * unlock a Locked account. Every change is an Access event in the audit trail.
 */
export function AccountsScreen({ onChanged }: { onChanged: () => void }) {
  const [accounts, setAccounts] = useState<AccountSummary[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saved, setSaved] = useState('');
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<{
    id: string;
    form: 'edit' | 'password' | 'deactivate';
  } | null>(null);

  useEffect(() => {
    fetch('/api/accounts')
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error);
        setAccounts(body.accounts);
      })
      .catch((e: Error) =>
        setLoadError(e.message || 'The accounts could not be loaded.'),
      );
  }, []);

  const apply: Apply = async (command, message) => {
    try {
      setAccounts(await send(command));
      setSaved(message);
      setAdding(false);
      setOpen(null);
      // The workspace's user list changes with the accounts.
      onChanged();
      return null;
    } catch (e) {
      setSaved('');
      return e instanceof Error ? e.message : String(e);
    }
  };

  return (
    <div className="scroll page accounts">
      <div className="page-heading accounts-heading">
        <p className="footnote">
          Before Go-live only: the Admin manages accounts here (ADR-0011). Every
          change is recorded in the audit trail as an Access event, and no
          password is ever shown or recorded.
        </p>
        {!adding && (
          <button
            className="btn primary sm"
            onClick={() => {
              setAdding(true);
              setOpen(null);
              setSaved('');
            }}
          >
            Add user
          </button>
        )}
      </div>
      {saved && (
        <p role="status" className="flash inline ok">
          {saved}
        </p>
      )}
      {loadError && (
        <p role="alert" className="flash inline error">
          {loadError}
        </p>
      )}
      {adding && (
        <AddUserForm apply={apply} onCancel={() => setAdding(false)} />
      )}
      {accounts && (
        <table className="grid accounts-table">
          <thead>
            <tr>
              <th>Printed name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => {
              const form = open?.id === account.id ? open.form : null;
              return (
                <AccountRow
                  key={account.id}
                  account={account}
                  lastAdmin={leavesNoActiveAdmin(accounts, account.id, {
                    active: false,
                  })}
                  form={form}
                  onOpen={(next) => {
                    setOpen(next && { id: account.id, form: next });
                    setAdding(false);
                    setSaved('');
                  }}
                  apply={apply}
                />
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AccountRow({
  account,
  lastAdmin,
  form,
  onOpen,
  apply,
}: {
  account: AccountSummary;
  /** The only active Admin, who can't be deactivated or change role. */
  lastAdmin: boolean;
  form: 'edit' | 'password' | 'deactivate' | null;
  onOpen: (form: 'edit' | 'password' | 'deactivate' | null) => void;
  apply: Apply;
}) {
  const { error, busy, submit: act } = useSubmit(apply);
  return (
    <>
      <tr className={account.active ? undefined : 'historical'}>
        <td>{account.name}</td>
        <td className="num">{account.id}</td>
        <td>{ROLE_LABELS[account.role]}</td>
        <td>
          <span className="account-status">
            {account.active ? 'Active' : 'Deactivated'}
          </span>
          {account.locked && (
            <span className="account-status locked">
              Locked · {account.failedAttempts} Failed attempts
            </span>
          )}
        </td>
        <td className="r nowrap">
          <span className="row-actions">
            {account.locked && (
              <button
                className="btn sm"
                disabled={busy}
                onClick={() =>
                  act(
                    { type: 'unlockAccount', username: account.id },
                    `${account.name} is unlocked.`,
                  )
                }
              >
                Unlock
              </button>
            )}
            <button
              className="btn sm"
              aria-expanded={form === 'edit'}
              onClick={() => onOpen(form === 'edit' ? null : 'edit')}
            >
              Edit
            </button>
            <button
              className="btn sm"
              aria-expanded={form === 'password'}
              onClick={() => onOpen(form === 'password' ? null : 'password')}
            >
              Set password
            </button>
            {account.active && lastAdmin ? (
              <button
                className="btn sm"
                aria-disabled="true"
                aria-describedby={`${account.id}-last-admin`}
                onClick={(e) => e.preventDefault()}
              >
                Deactivate
              </button>
            ) : account.active ? (
              <button
                className="btn sm"
                aria-expanded={form === 'deactivate'}
                onClick={() =>
                  onOpen(form === 'deactivate' ? null : 'deactivate')
                }
              >
                Deactivate
              </button>
            ) : (
              <button
                className="btn sm"
                disabled={busy}
                onClick={() =>
                  act(
                    {
                      type: 'updateAccount',
                      username: account.id,
                      active: true,
                    },
                    `${account.name} is reactivated.`,
                  )
                }
              >
                Reactivate
              </button>
            )}
          </span>
          {lastAdmin && (
            <p id={`${account.id}-last-admin`} className="flash inline neutral">
              {NO_ACTIVE_ADMIN_LEFT}
            </p>
          )}
          {error && (
            <p role="alert" className="flash inline error">
              {error}
            </p>
          )}
        </td>
      </tr>
      {form && (
        <tr className="account-form-row">
          <td colSpan={5}>
            {form === 'edit' && (
              <EditUserForm
                account={account}
                lastAdmin={lastAdmin}
                apply={apply}
                onCancel={() => onOpen(null)}
              />
            )}
            {form === 'password' && (
              <PasswordForm
                account={account}
                apply={apply}
                onCancel={() => onOpen(null)}
              />
            )}
            {form === 'deactivate' && (
              <DeactivateConfirm
                account={account}
                apply={apply}
                onCancel={() => onOpen(null)}
              />
            )}
          </td>
        </tr>
      )}
    </>
  );
}

/** A form's refusal, linked to the form for assistive technology. */
function Refusal({ id, error }: { id: string; error: string }) {
  return error ? (
    <p id={id} role="alert" className="flash inline error">
      {error}
    </p>
  ) : null;
}

function useSubmit(apply: Apply) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (command: AccountCommand, message: string) => {
    setBusy(true);
    setError((await apply(command, message)) ?? '');
    setBusy(false);
  };
  return { error, busy, submit };
}

/** A password field whose Show button sits outside its label, so the field
 * is named by the label alone. */
function PasswordInput({ label = 'Password' }: { label?: string }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <span className="password-field">
        <input
          id={id}
          name="password"
          type={shown ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={200}
        />
        <button
          type="button"
          className="btn sm"
          aria-pressed={shown}
          onClick={() => setShown(!shown)}
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      </span>
    </div>
  );
}

/** The role picker. For the only active Admin, `onlyAdmin` is the id of the
 * visible reason every other role is blocked. */
function RoleSelect({
  defaultValue,
  onlyAdmin,
}: {
  defaultValue?: Role;
  onlyAdmin?: string;
}) {
  return (
    <label>
      Role
      <select
        name="role"
        required
        defaultValue={defaultValue ?? ''}
        aria-describedby={onlyAdmin}
      >
        <option value="" disabled>
          Select a role
        </option>
        {roles.map((role) => (
          <option
            key={role}
            value={role}
            disabled={Boolean(onlyAdmin) && role !== 'admin'}
          >
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
      {onlyAdmin && (
        <small id={onlyAdmin} className="flash inline neutral">
          {NO_ACTIVE_ADMIN_LEFT}
        </small>
      )}
    </label>
  );
}

function AddUserForm({
  apply,
  onCancel,
}: {
  apply: Apply;
  onCancel: () => void;
}) {
  const errorId = useId();
  const { error, busy, submit } = useSubmit(apply);
  return (
    <form
      className="form account-form"
      aria-labelledby={`${errorId}-title`}
      aria-describedby={error ? errorId : undefined}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const name = String(f.get('name')).trim();
        submit(
          {
            type: 'addAccount',
            username: String(f.get('username')).trim(),
            name,
            role: String(f.get('role')) as Role,
            password: String(f.get('password')),
          },
          `${name} is added and can sign in.`,
        );
      }}
    >
      <h2 id={`${errorId}-title`}>Add user</h2>
      <Refusal id={errorId} error={error} />
      <div className="fields">
        <div className="field">
          <label htmlFor={`${errorId}-username`}>Username</label>
          <input
            id={`${errorId}-username`}
            name="username"
            autoComplete="off"
            required
            maxLength={40}
            pattern="[a-z0-9][a-z0-9\-]{1,39}"
            aria-describedby={`${errorId}-username-help`}
          />
          <small id={`${errorId}-username-help`}>
            Lowercase letters, digits and hyphens. Never reused.
          </small>
        </div>
        <div className="field">
          <label htmlFor={`${errorId}-name`}>Printed name</label>
          <input
            id={`${errorId}-name`}
            name="name"
            autoComplete="off"
            required
            maxLength={80}
            aria-describedby={`${errorId}-name-help`}
          />
          <small id={`${errorId}-name-help`}>
            Shown on the audit trail and on signatures.
          </small>
        </div>
        <RoleSelect />
        <PasswordInput />
      </div>
      <div className="form-foot">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn primary" disabled={busy}>
          {busy ? 'Adding…' : 'Add user'}
        </button>
      </div>
    </form>
  );
}

function EditUserForm({
  account,
  lastAdmin,
  apply,
  onCancel,
}: {
  account: AccountSummary;
  lastAdmin: boolean;
  apply: Apply;
  onCancel: () => void;
}) {
  const errorId = useId();
  const { error, busy, submit } = useSubmit(apply);
  return (
    <form
      className="form account-form"
      aria-label={`Edit ${account.name}`}
      aria-describedby={error ? errorId : undefined}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        submit(
          {
            type: 'updateAccount',
            username: account.id,
            name: String(f.get('name')).trim(),
            role: String(f.get('role')) as Role,
          },
          `${account.id} is saved.`,
        );
      }}
    >
      <Refusal id={errorId} error={error} />
      <div className="fields">
        <label>
          Printed name
          <input
            name="name"
            defaultValue={account.name}
            required
            maxLength={80}
          />
        </label>
        <RoleSelect
          defaultValue={account.role}
          onlyAdmin={lastAdmin ? `${account.id}-role-last-admin` : undefined}
        />
      </div>
      <div className="form-foot">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

function PasswordForm({
  account,
  apply,
  onCancel,
}: {
  account: AccountSummary;
  apply: Apply;
  onCancel: () => void;
}) {
  const errorId = useId();
  const { error, busy, submit } = useSubmit(apply);
  return (
    <form
      className="form account-form"
      aria-label={`Set a password for ${account.name}`}
      aria-describedby={error ? errorId : undefined}
      onSubmit={(e) => {
        e.preventDefault();
        submit(
          {
            type: 'setPassword',
            username: account.id,
            password: String(new FormData(e.currentTarget).get('password')),
          },
          `${account.name}'s new password works at their next sign-in.`,
        );
      }}
    >
      <Refusal id={errorId} error={error} />
      <div className="fields">
        <PasswordInput label={`New password for ${account.name}`} />
      </div>
      <div className="form-foot">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn primary" disabled={busy}>
          {busy ? 'Saving…' : 'Set password'}
        </button>
      </div>
    </form>
  );
}

function DeactivateConfirm({
  account,
  apply,
  onCancel,
}: {
  account: AccountSummary;
  apply: Apply;
  onCancel: () => void;
}) {
  const errorId = useId();
  const { error, busy, submit } = useSubmit(apply);
  return (
    <div
      className="form account-form"
      role="group"
      aria-label={`Deactivate ${account.name}`}
      aria-describedby={error ? errorId : undefined}
    >
      <Refusal id={errorId} error={error} />
      <p>
        Deactivate {account.name}? They are signed out at once and can no longer
        sign in, act or sign. Their past work stays on record under their name.
      </p>
      <div className="form-foot">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={() =>
            submit(
              { type: 'updateAccount', username: account.id, active: false },
              `${account.name} is deactivated.`,
            )
          }
        >
          {busy ? 'Deactivating…' : 'Deactivate'}
        </button>
      </div>
    </div>
  );
}
