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

/** Letters and digits nobody misreads when a password is read out or copied
 * from a printout: no 0/O, 1/I/L. */
const ONE_TIME_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** A random One-time password of four groups of four, about 79 bits. */
export function generateOneTimePassword(): string {
  const characters = [...randomBytes(16)].map(
    // 256 is not a multiple of 31, so reject the few bytes that would bias it.
    function pick(byte): string {
      return byte < 248
        ? ONE_TIME_ALPHABET[byte % ONE_TIME_ALPHABET.length]
        : pick(randomBytes(1)[0]);
    },
  );
  return [0, 4, 8, 12]
    .map((start) => characters.slice(start, start + 4).join(''))
    .join('-');
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
