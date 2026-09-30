#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cssDeclarations } from './css-rules.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const css = readFileSync(process.argv[2] ?? resolve(repo, 'src/styles.css'), 'utf8');
const declarations = cssDeclarations(css);

const TEXT_PAIRINGS = [
  ...['ink', 'ink-2', 'muted', 'accent'].flatMap((fg) =>
    ['ground', 'surface', 'raised', 'sunk'].map((bg) => [fg, bg]),
  ),
  ...['alert', 'late', 'returned', 'approved', 'awaiting', 'progress', 'received'].flatMap(
    (fg) => ['raised', 'surface'].map((bg) => [fg, bg]),
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

const MAY_FADE = {
  blockedControls: [/disabled/, /\.blocked/],
  decorativeMarks: [/\.caret/, /\.seg-dot/],
};

function tokens(scheme) {
  const hex = (within) =>
    Object.fromEntries(
      declarations
        .filter((d) => d.property.startsWith('--') && /^#[0-9a-f]{6}$/i.test(d.value))
        .filter((d) => within(d.within))
        .map((d) => [d.property.slice(2), d.value]),
    );
  const light = hex((w) => w.length === 1 && w[0] === ':root');
  if (scheme === 'light') return light;
  return { ...light, ...hex((w) => w.some((b) => b.includes('prefers-color-scheme: dark'))) };
}

function contrastRatio(a, b) {
  const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function contrastResults() {
  return ['light', 'dark'].flatMap((scheme) => {
    const palette = tokens(scheme);
    return TEXT_PAIRINGS.map(([fg, bg]) => {
      const label = `${scheme.padEnd(5)} --${fg} on --${bg}`;
      if (!palette[fg] || !palette[bg]) return { ok: false, line: `${label}: token missing` };
      const ratio = contrastRatio(palette[fg], palette[bg]);
      return { ok: ratio >= 4.5, line: `${label}: ${ratio.toFixed(2)}:1` };
    });
  });
}

function fadeResults() {
  return declarations
    .filter((d) => d.property === 'opacity' && Number(d.value) < 1)
    .map((d) => {
      const entrance = d.within.some((block) => block.startsWith('@starting-style'));
      const exempt = Object.values(MAY_FADE).flat().some((re) => re.test(d.selector));
      return { ok: entrance || exempt, line: `opacity ${d.value} on ${d.selector}` };
    });
}

const results = [...contrastResults(), ...fadeResults()];
for (const { ok, line } of results) console.log(`${ok ? 'ok  ' : 'FAIL'} ${line}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `${failed} check(s) failed` : 'every pairing meets 4.5:1 and no text is faded');
process.exit(failed ? 1 : 0);
