import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseTagRefusal, runningVersion } from '../server/release.ts';

const commit = '845f522b0c9d7e41a3f6b2c8d5e9f0a1b2c3d4e5';

test('a build checked out at its release tag shows the version and the commit', () => {
  assert.equal(
    runningVersion('1.0.0-rc1', {
      commit,
      tags: ['v1.0.0-rc1'],
      modified: false,
    }),
    `1.0.0-rc1 (commit ${commit})`,
  );
});

test('a build that is not exactly its release says so, so it is never mistaken for the release', () => {
  assert.equal(
    runningVersion('1.0.0-rc1', { commit, tags: [], modified: false }),
    `1.0.0-rc1 (commit ${commit}, not the release v1.0.0-rc1)`,
  );
  assert.equal(
    runningVersion('1.0.0-rc1', {
      commit,
      tags: ['v1.0.0-rc1'],
      modified: true,
    }),
    `1.0.0-rc1 (commit ${commit} with uncommitted changes, not the release v1.0.0-rc1)`,
  );
  assert.equal(
    runningVersion('1.0.0', { commit, tags: ['v1.0.0-rc2'], modified: false }),
    `1.0.0 (commit ${commit}, not the release v1.0.0)`,
  );
  assert.equal(
    runningVersion('1.0.0', null),
    '1.0.0 (commit unknown, not a git checkout)',
  );
});

test('a release tag names the version the build stamps, as a release candidate or a final release', () => {
  assert.equal(releaseTagRefusal('v1.0.0-rc1', '1.0.0-rc1'), null);
  assert.equal(releaseTagRefusal('v1.0.0', '1.0.0'), null);
  assert.equal(releaseTagRefusal('v2.13.4-rc12', '2.13.4-rc12'), null);
});

test('a tag that is not the stamped version is refused, so no release is validated under the wrong version', () => {
  assert.equal(
    releaseTagRefusal('v1.0.0', '1.0.0-rc2'),
    'The tag v1.0.0 does not match the version 1.0.0-rc2 in package.json; set the version to 1.0.0 and tag that commit.',
  );
  assert.equal(
    releaseTagRefusal('v1.0.1', '1.0.0'),
    'The tag v1.0.1 does not match the version 1.0.0 in package.json; set the version to 1.0.1 and tag that commit.',
  );
});

test('a tag that is not a release tag is refused', () => {
  for (const tag of [
    '1.0.0',
    'v1.0',
    'v1.0.0-beta1',
    'v1.0.0-rc.1',
    'v1.0.0-rc0',
    'v01.0.0',
    'v1.0.0-rc1+build',
  ])
    assert.equal(
      releaseTagRefusal(tag, tag.replace(/^v/, '')),
      `The tag ${tag} is not a release tag: use vX.Y.Z-rcN for a release candidate or vX.Y.Z for a final release.`,
    );
});
