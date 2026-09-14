import {
  randomBytes,
  scrypt as scryptCallback,
  scryptSync,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

/**
 * Password hashes are `scrypt$N$r$p$salt$hash` (salt and hash base64url), so
 * the cost parameters travel with each hash and can be raised later without
 * invalidating existing accounts. Every hash has its own random salt.
 */
const COST = { N: 16384, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;

function scrypt(password: string, salt: Buffer, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scryptCallback(password, salt, KEY_LENGTH, options, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH, COST);
  return [
    'scrypt',
    COST.N,
    COST.r,
    COST.p,
    salt.toString('base64url'),
    hash.toString('base64url'),
  ].join('$');
}

/** The salt, expected hash and cost parameters of a stored hash, or null. */
function parse(stored: string) {
  const [scheme, n, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return null;
  return {
    salt: Buffer.from(salt, 'base64url'),
    expected: Buffer.from(hash, 'base64url'),
    options: { N: Number(n), r: Number(r), p: Number(p) },
  };
}

const same = (actual: Buffer, expected: Buffer) =>
  actual.length === expected.length && timingSafeEqual(actual, expected);

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parsed = parse(stored);
  if (!parsed) return false;
  return same(
    await scrypt(password, parsed.salt, parsed.options),
    parsed.expected,
  );
}

/** The blocking form, for the laboratory core, which verifies an Electronic
 * signature inside its synchronous command transaction. */
export function verifyPasswordSync(password: string, stored: string): boolean {
  const parsed = parse(stored);
  if (!parsed) return false;
  return same(
    scryptSync(password, parsed.salt, KEY_LENGTH, parsed.options),
    parsed.expected,
  );
}
