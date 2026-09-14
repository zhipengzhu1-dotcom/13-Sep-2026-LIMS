# Releases

Computerised system validation references one frozen, tagged release of Benchline. This file says how a release is cut and how its automated test record is kept. It is the developer side only: the lab's Benchline change control SOP governs authorizing, validating and deploying a release, and wins where they differ.

## Versions and tags

- The version is `version` in `package.json`: `X.Y.Z-rcN` for a release candidate, `X.Y.Z` for a final release.
- A release is the tag `v` + that version (`v1.0.0-rc1`, `v1.0.0`) on the commit whose `package.json` holds it. The release workflow refuses any other tag (`npm run release-tag -- <tag>`).
- A tag is never moved or deleted. A candidate that fails, or needs any change, is followed by the next candidate (`-rc2`); the final release is tagged on the commit of the candidate that was validated, with only the version changed. Protect `v*` tags in the repository's rulesets against update and deletion.

## Cutting a release

1. Set the version: `npm version 1.0.0-rc1 --no-git-tag-version`, commit it, and push.
2. Tag that commit and push the tag: `git tag v1.0.0-rc1 && git push origin v1.0.0-rc1`.
3. The **Release test record** workflow (`.github/workflows/release.yml`) runs on the tagged commit: it checks the tag, installs from the lockfile with `npm ci`, and runs `npm run check` (type check, build, the full automated test suite). Its log opens with the tag, commit, run, runner, Node and npm versions and the UTC start time, and ends with the UTC finish time and exit status.
4. The log and its SHA-256 are kept as a workflow artifact for 90 days, whether the run passed or failed. When it passes, both are also attached to the tag's GitHub Release (a pre-release for a candidate). A rerun adds its own log; none is replaced.

## Filing the test record

- Download every run's log for the tag, failed runs included, and file each with its SHA-256 in the lab's controlled validation records for the retention period the SOP sets. The artifact expires and a GitHub Release can be edited, so neither is the record. A failed or flaky run is a finding to resolve, not something to rerun until it passes.
- The release record approved by the Quality lead (ADR-0007) names the tag, the commit, the run URLs, the log checksums and the changes in the release.

The log is automated test evidence referenced by validation, not validation itself: Benchline is validated by the signed user acceptance tests run against the same tag on the Validation environment (ADR-0001).

## Deploying

The System administrator deploys a tag only after the Quality lead approves its release record (ADR-0007), from a git checkout of that tag with no local changes. Benchline prints `Version: X.Y.Z (commit <sha>)` at start-up and the workspace status bar shows the same, so the deployment log can record it. A build that is not exactly its tag shows `not the release vX.Y.Z` (or `commit unknown` outside a git checkout) and must not run as the Production instance or the Validation environment.
