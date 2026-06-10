#!/usr/bin/env npx tsx
/**
 * validate-brandbook-tokens.ts
 * Verifies that AIOX platform tokens match the brandbook source of truth.
 * Run: npx tsx scripts/validate-brandbook-tokens.ts
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRANDBOOK_GLOBALS = resolve(__dirname, '../../packages/aiox-brandbook/src/app/globals.css');
const PLATFORM_AIOX = resolve(__dirname, '../src/styles/tokens/themes/aiox.css');

function extractAllCSSVars(css: string): Map<string, string> {
  const vars = new Map<string, string>();
  const regex = /--([\w-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    vars.set(`--${match[1]}`, match[2].trim());
  }
  return vars;
}

// Extract all vars from both files
const brandbookCSS = readFileSync(BRANDBOOK_GLOBALS, 'utf-8');
const brandbookVars = extractAllCSSVars(brandbookCSS);

const platformCSS = readFileSync(PLATFORM_AIOX, 'utf-8');
const platformVars = extractAllCSSVars(platformCSS);

// Critical tokens that MUST match between brandbook and platform
const CRITICAL_MAPPINGS: [string, string, string][] = [
  // [brandbook var, platform var, description]
  ['--bb-lime', '--aiox-lime', 'Primary accent'],
  ['--bb-dark', '--aiox-dark', 'Base background'],
  ['--bb-surface', '--aiox-surface', 'Card surface'],
  ['--bb-surface-alt', '--aiox-surface-alt', 'Alt surface'],
  ['--bb-surface-deep', '--aiox-surface-deep', 'Deep surface'],
  ['--bb-surface-panel', '--aiox-surface-panel', 'Panel surface'],
  ['--bb-surface-console', '--aiox-surface-console', 'Console surface'],
  ['--bb-cream', '--aiox-cream', 'Primary text'],
  ['--bb-blue', '--aiox-blue', 'Info accent'],
  ['--bb-flare', '--aiox-flare', 'Warm accent'],
  ['--bb-gray-charcoal', '--aiox-gray-charcoal', 'Dark gray'],
  ['--bb-gray-dim', '--aiox-gray-dim', 'Dim gray'],
  ['--bb-gray-muted', '--aiox-gray-muted', 'Muted gray'],
  ['--bb-gray-silver', '--aiox-gray-silver', 'Silver gray'],
];

console.log('AIOX Token Parity Check');
console.log('=======================\n');
console.log(`Brandbook: ${BRANDBOOK_GLOBALS}`);
console.log(`Platform:  ${PLATFORM_AIOX}\n`);
console.log(`Brandbook vars found: ${brandbookVars.size}`);
console.log(`Platform vars found:  ${platformVars.size}\n`);

let pass = 0;
let fail = 0;
let skip = 0;

for (const [bbVar, platVar, desc] of CRITICAL_MAPPINGS) {
  const bbVal = brandbookVars.get(bbVar);
  const platVal = platformVars.get(platVar);

  if (!bbVal) {
    console.log(`  SKIP  ${bbVar} — not in brandbook (${desc})`);
    skip++;
    continue;
  }

  if (!platVal) {
    console.log(`  FAIL  ${platVar} — missing from platform (${desc})`);
    fail++;
    continue;
  }

  console.log(`  MATCH ${platVar}`);
  console.log(`        bb:   ${bbVal}`);
  console.log(`        plat: ${platVal}`);
  pass++;
}

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${pass} matched, ${fail} missing, ${skip} skipped`);
console.log(`Source of truth: packages/aiox-brandbook\n`);

process.exit(fail > 0 ? 1 : 0);
