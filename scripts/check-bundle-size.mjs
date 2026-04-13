#!/usr/bin/env node
/**
 * Bundle-size budget check.
 *
 * Measures the gzip size of the main production JS bundle in `dist/assets/`
 * and fails the build if it exceeds the configured budget.
 *
 * Assumes `pnpm build` has already run (or runs it when passed `--build`).
 *
 * Budgets (kb gzipped):
 *   Main JS          150
 *   Main CSS          15
 *   AI worker JS      50
 *
 * Output:
 *   Human readable summary on stdout.
 *   Exit 0 on pass, 1 on budget breach.
 */

import { execSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const distAssets = join(root, 'dist', 'assets');

const BUDGETS_KB = {
  main: 150,
  css: 15,
  worker: 50,
};

if (process.argv.includes('--build')) {
  execSync('pnpm build', { cwd: root, stdio: 'inherit' });
}

/** Find the first file in `distAssets` whose name matches the regex. */
function findAsset(re) {
  let entries;
  try {
    entries = readdirSync(distAssets);
  } catch {
    process.stderr.write(`error: ${distAssets} does not exist — run \`pnpm build\` first\n`);
    process.exit(1);
  }
  const match = entries.find((f) => re.test(f));
  return match ? join(distAssets, match) : null;
}

function gzipSizeKb(path) {
  const bytes = gzipSync(readFileSync(path)).length;
  return Math.round((bytes / 1024) * 100) / 100;
}

function rawSizeKb(path) {
  return Math.round((statSync(path).size / 1024) * 100) / 100;
}

const checks = [
  { name: 'Main JS', re: /^index-.*\.js$/, budget: BUDGETS_KB.main, key: 'main' },
  { name: 'Main CSS', re: /^index-.*\.css$/, budget: BUDGETS_KB.css, key: 'css' },
  { name: 'AI worker JS', re: /^ai\.worker-.*\.js$/, budget: BUDGETS_KB.worker, key: 'worker' },
];

let failed = false;
process.stdout.write(`Bundle-size check (gzip, budget enforced):\n`);
for (const c of checks) {
  const path = findAsset(c.re);
  if (!path) {
    process.stdout.write(`  ? ${c.name.padEnd(14)}— not found (skipped)\n`);
    continue;
  }
  const gz = gzipSizeKb(path);
  const raw = rawSizeKb(path);
  const ok = gz <= c.budget;
  const mark = ok ? '✓' : '✗';
  process.stdout.write(
    `  ${mark} ${c.name.padEnd(14)} ${gz.toFixed(2)} kB gz  ` +
      `(raw ${raw.toFixed(2)} kB)  — budget ${c.budget} kB\n`,
  );
  if (!ok) {
    failed = true;
  }
}

if (failed) {
  process.stdout.write('\nBundle size exceeded one or more budgets.\n');
  process.exit(1);
}
process.stdout.write('\nAll bundle-size budgets passed.\n');
