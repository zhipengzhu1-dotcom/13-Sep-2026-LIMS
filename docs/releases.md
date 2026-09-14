# Releases

Computerised system validation references one frozen, tagged release of Benchline. This file says how a release is cut and how its automated test record is kept. It is the developer side only: the lab's Benchline change control SOP governs authorizing, validating and deploying a release, and wins where they differ.

## Versions and tags

- The version is `version` in `package.json`: `X.Y.Z-rcN` for a release candidate, `X.Y.Z` for a final release.
- A release is the tag `v` + that version (`v1.0.0-rc1`, `v1.0.0`) on the commit whose `package.json` holds it. The release workflow refuses any other tag (`npm run release-tag -- <tag>`).
- A tag is never moved or deleted. A candidate that fails, or needs any change, is followed by the next candidate (`-rc2`); the final release is tagged on the commit of the candidate that was validated, with only the version changed (ADR-0012).
- GitHub's tag rulesets need a paid plan for this private repository, so nothing technical stops a tag being moved. The commit and log checksums in the release record make a moved tag or swapped log detectable. If the repository gains rulesets, protect `v*` tags against update and deletion.

## Cutting a release

1. Set the version: `npm version 1.0.0-rc1 --no-git-tag-version`, commit it, and push.
2. Tag that commit and push the tag: `git tag v1.0.0-rc1 && git push origin v1.0.0-rc1`.
3. The **Release test record** workflow (`.github/workflows/release.yml`) runs on the tagged commit: it checks the tag, installs from the lockfile with `npm ci`, and runs `npm run check` (type check, build, the full automated test suite). Its log opens with the tag, commit, run, runner, Node and npm versions and the UTC start time, and ends with the UTC finish time and exit status.
4. The log and its SHA-256 are kept, whether the run passed or failed, as a workflow artifact for 90 days and on the tag's GitHub Release, labelled with the run, attempt and outcome. The Release is a pre-release for a candidate, and any failed run marks it a pre-release that is not releasable. A rerun adds its own log; none is replaced.

## Filing the test record

- Download every run's log for the tag from its GitHub Release, failed runs included, and file each with its SHA-256 in the lab's controlled validation records for the retention period the SOP sets. The artifact expires and a GitHub Release can be edited, so neither is the record. A failed or flaky run is a finding to resolve, not something to rerun until it passes.
- The release record approved by the Quality lead (ADR-0007) names the tag, the commit, the run URLs, the log checksums and the changes in the release.

The log is automated test evidence referenced by validation, not validation itself: Benchline is validated by the signed user acceptance tests run against the same tag on the Validation environment (ADR-0001).

## Deploying

The System administrator deploys a tag only after the Quality lead approves its release record (ADR-0007), from a git checkout of that tag with no local changes. Benchline prints `Version: X.Y.Z (commit <sha>)` at start-up and the workspace status bar shows the same, so the deployment log can record it. A build that is not exactly its tag shows `not the release vX.Y.Z` (or `commit unknown` outside a git checkout) and must not run as the Production instance or the Validation environment.

Benchline asks git for the commit when it starts, as the operating-system user the service runs as. Two things on the lab server make a correct release show the wrong line, so check the printed version after every deployment:

- **`commit unknown`**: git refuses to read a checkout owned by another user ("dubious ownership"). Have the service user own the checkout, or add it with `git config --system --add safe.directory <path>`.
- **`with uncommitted changes`**: a file git does not ignore sits in the checkout. Keep databases, backups and logs outside it or in its ignored `data/` folder.
