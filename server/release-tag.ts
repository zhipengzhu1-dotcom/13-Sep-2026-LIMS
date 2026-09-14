import { packageVersion, releaseTagRefusal } from './release.ts';

// Run by the release workflow before the automated test record: a tag that is
// not the version this commit stamps is refused.
const tag = process.argv[2] ?? '';
const refusal = releaseTagRefusal(tag, packageVersion());
if (refusal) {
  console.error(refusal);
  process.exit(1);
}
console.log(`The tag ${tag} is the version in package.json.`);
