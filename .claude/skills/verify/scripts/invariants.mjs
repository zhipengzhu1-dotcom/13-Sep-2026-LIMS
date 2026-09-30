#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cssDeclarations } from './css-rules.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const css = readFileSync(process.argv[2] ?? resolve(repo, 'src/styles.css'), 'utf8');
const declarations = cssDeclarations(css);

const on = (selector, property) =>
  declarations.filter((d) => d.selector === selector && d.property === property);
const inEntrance = (d) => d.within.some((block) => block.startsWith('@starting-style'));
const inBlock = (d, text) => d.within.some((block) => block.includes(text));
const REASONS = /\.(flash(?!\.ok)|refusal|warn|error|oos-status|oos-flag|deviations|status|conformity|cert-tag)\b/;

const INVARIANTS = {
  'a Result value is always ink, never a verdict colour': () =>
    on('.value', 'color').length > 0 && on('.value', 'color').every((d) => d.value === 'var(--ink)'),

  'the Certificate document keeps Archivo, normal figures and normal tracking': () =>
    on('.certificate-document', 'font-family').some((d) => d.value.startsWith('Archivo')) &&
    on('.certificate-document', 'font-variant-numeric').some((d) => d.value === 'normal') &&
    on('.certificate-document', 'letter-spacing').some((d) => d.value === 'normal'),

  'the Certificate never animates': () =>
    !declarations.some(
      (d) =>
        /certificate/.test(d.selector) &&
        (inEntrance(d) || ['transition', 'animation'].includes(d.property)),
    ),

  'a reason, badge or hold never fades or slides in': () =>
    !declarations.some((d) => inEntrance(d) && REASONS.test(d.selector)),

  'press and entrance scaling only when motion is welcome': () =>
    declarations
      .filter((d) => d.property === 'transform' && d.value.includes('scale('))
      .every(
        (d) =>
          inBlock(d, 'prefers-reduced-motion: no-preference') ||
          (inEntrance(d) &&
            declarations.some(
              (r) =>
                inBlock(r, 'prefers-reduced-motion: reduce') &&
                inEntrance(r) &&
                r.selector === d.selector &&
                r.property === 'transform' &&
                r.value === 'none',
            )),
      ),

  'hover styles only for a fine pointer': () =>
    declarations
      .filter((d) => /:hover/.test(d.selector))
      .every((d) => inBlock(d, '(hover: hover) and (pointer: fine)') || /aria-disabled/.test(d.selector)),
};

let failed = 0;
for (const [rule, holds] of Object.entries(INVARIANTS)) {
  const ok = holds();
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${rule}`);
}
process.exit(failed ? 1 : 0);
