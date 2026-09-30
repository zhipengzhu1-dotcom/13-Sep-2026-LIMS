#!/usr/bin/env node
// Measures WCAG 2 contrast for every text-on-background pairing the workspace
// draws from its tokens, in light and dark, and exits 1 if any falls below AA
// (4.5:1 for text). Reads the tokens straight from src/styles.css. Token
// ratios can't see opacity, so it also fails any rule that fades an element
// below full opacity unless the selector is one the ALLOWED_OPACITY list names.
// Usage: node .claude/skills/verify/scripts/contrast.mjs [path/to/styles.css]
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const css = readFileSync(process.argv[2] ?? resolve(repo, 'src/styles.css'), 'utf8');

const block = (source) => {
  const tokens = {};
  for (const [, name, value] of source.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g))
    tokens[name] = value;
  return tokens;
};
const rootStart = css.indexOf(':root {');
const darkStart = css.indexOf('@media (prefers-color-scheme: dark)');
const light = block(css.slice(rootStart, darkStart));
const dark = { ...light, ...block(css.slice(darkStart, css.indexOf('\n}\n', darkStart))) };

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const grounds = ['ground', 'surface', 'raised', 'sunk'];
const pairs = [
  ...['ink', 'ink-2', 'muted', 'accent'].flatMap((t) => grounds.map((g) => [t, g])),
  ...['alert', 'late', 'returned', 'approved', 'awaiting', 'progress', 'received'].flatMap(
    (t) => ['raised', 'surface'].map((g) => [t, g]),
  ),
  ['received', 'received-wash'],
  ['progress', 'progress-wash'],
  ['returned', 'returned-wash'],
  ['awaiting', 'awaiting-wash'],
  ['alert', 'alert-wash'],
  ['late', 'late-wash'],
  ['approved', 'approved-wash'],
  ['ink-2', 'sunk'],
  ['muted', 'accent-wash'],
  ['ink', 'accent-wash'],
  ['accent-ink', 'accent'],
  ['primary-ink', 'primary'],
];

let failed = 0;
for (const [scheme, tokens] of [['light', light], ['dark', dark]]) {
  for (const [fg, bg] of pairs) {
    if (!tokens[fg] || !tokens[bg]) {
      console.log(`MISSING ${scheme}: --${fg} or --${bg}`);
      failed++;
      continue;
    }
    const r = ratio(tokens[fg], tokens[bg]);
    const ok = r >= 4.5;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${scheme.padEnd(5)} --${fg} on --${bg}: ${r.toFixed(2)}:1`);
  }
}
// Fading text lowers its contrast below what the tokens promise. These are the
// only places an opacity below 1 is allowed: blocked controls (whose reason is
// separate visible text), decorative marks with no text, and entrance states.
const ALLOWED_OPACITY = [
  /disabled/,
  /\.blocked/,
  /\.caret/,
  /\.seg-dot/,
  /@starting-style/,
  /::backdrop/,
];
const opacityRules = [];
let context = '';
for (const line of css.split('\n')) {
  if (/\{\s*$/.test(line)) context = line.trim();
  const m = line.match(/^\s*opacity:\s*(0?\.\d+|0)\s*;/);
  if (m) opacityRules.push({ selector: context, value: m[1] });
}
const starting = [...css.matchAll(/@starting-style\s*\{([^@]*?)\n\s{0,2}\}/g)].map((x) => x[1]);
for (const { selector, value } of opacityRules) {
  const inStarting = starting.some((block) => block.includes(selector));
  const allowed = inStarting || ALLOWED_OPACITY.some((re) => re.test(selector));
  if (!allowed) failed++;
  console.log(`${allowed ? 'ok  ' : 'FAIL'} opacity ${value} on ${selector.replace(/\s*\{$/, '')}`);
}

console.log(failed ? `${failed} check(s) failed` : 'every pairing meets 4.5:1 and no text is faded');
process.exit(failed ? 1 : 0);
