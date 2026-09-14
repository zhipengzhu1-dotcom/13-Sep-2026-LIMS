import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** A release tag: `vX.Y.Z-rcN` for a release candidate, `vX.Y.Z` for a final
 * release. Numbers carry no leading zeros and candidates count from 1. */
const RELEASE_TAG = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-rc[1-9]\d*)?$/;

/**
 * Why a tag cannot be released from a commit whose package.json holds
 * `version`, or null when it can. Computerised system validation references
 * one tagged release, so the version the running build stamps must be the tag.
 */
export function releaseTagRefusal(tag: string, version: string): string | null {
  if (!RELEASE_TAG.test(tag))
    return `The tag ${tag} is not a release tag: use vX.Y.Z-rcN for a release candidate or vX.Y.Z for a final release.`;
  if (tag !== `v${version}`)
    return `The tag ${tag} does not match the version ${version} in package.json; set the version to ${tag.slice(1)} and tag that commit.`;
  return null;
}

/** The git checkout a build runs from: its commit, the tags on that commit,
 * and whether any file differs from the commit. */
export type Checkout = { commit: string; tags: string[]; modified: boolean };

/**
 * The running version as the server log and the workspace show it: the
 * package.json version with the commit it runs from. A build that is not
 * exactly its release tag, unchanged, says so, since the same version number
 * alone does not show that the tested build is the one running.
 */
export function runningVersion(
  version: string,
  checkout: Checkout | null,
): string {
  const release = `v${version}`;
  if (!checkout) return `${version} (commit unknown, not a git checkout)`;
  const { commit, tags, modified } = checkout;
  if (modified)
    return `${version} (commit ${commit} with uncommitted changes, not the release ${release})`;
  if (!tags.includes(release))
    return `${version} (commit ${commit}, not the release ${release})`;
  return `${version} (commit ${commit})`;
}

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** The version in package.json. */
export function packageVersion(): string {
  return JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8')).version;
}

/** The checkout Benchline runs from, or null when git cannot tell (no git, or
 * not a git checkout). Ignored files, such as the database, don't count. */
export function currentCheckout(): Checkout | null {
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  try {
    return {
      commit: git('rev-parse', 'HEAD'),
      tags: git('tag', '--points-at', 'HEAD').split('\n').filter(Boolean),
      modified: git('status', '--porcelain').length > 0,
    };
  } catch {
    return null;
  }
}
