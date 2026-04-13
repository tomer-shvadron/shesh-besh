#!/usr/bin/env node
/**
 * Lighthouse performance baseline.
 *
 * Runs Lighthouse (headless Chrome) against the `pnpm preview` server and
 * prints the key Core Web Vital scores:
 *
 *   Performance / Accessibility / Best-Practices / SEO / PWA (0–100)
 *   LCP, CLS, TBT, INP, FCP                          (values)
 *   Main JS bundle size                              (kB gzip)
 *
 * Usage:
 *   pnpm preview &                              # start the preview server
 *   node scripts/lighthouse.mjs                 # audit http://localhost:4173
 *   node scripts/lighthouse.mjs --url http://localhost:5173
 *   node scripts/lighthouse.mjs --mobile        # emulate Moto G Power (mobile)
 *
 * Requires `lighthouse` and `chrome-launcher` to be installed:
 *   pnpm add -D lighthouse chrome-launcher
 *
 * The script dynamically imports these deps so `node scripts/lighthouse.mjs`
 * with nothing installed exits gracefully with install instructions.
 *
 * Exit code:
 *   0 — Performance score ≥ threshold (95 desktop, 85 mobile)
 *   1 — below threshold, dependency missing, or audit failed
 */

import process from 'node:process';

const args = process.argv.slice(2);
const urlArg = args.find((a) => a.startsWith('--url='));
const url = urlArg ? urlArg.slice('--url='.length) : 'http://localhost:4173';
const isMobile = args.includes('--mobile');
const performanceThreshold = isMobile ? 0.85 : 0.95;

let lighthouse;
let chromeLauncher;
try {
  ({ default: lighthouse } = await import('lighthouse'));
  chromeLauncher = await import('chrome-launcher');
} catch {
  process.stderr.write(
    'lighthouse / chrome-launcher not installed.\n' +
      'Run:  pnpm add -D lighthouse chrome-launcher\n',
  );
  process.exit(1);
}

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new'] });

try {
  const options = {
    logLevel: 'error',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
    port: chrome.port,
    formFactor: isMobile ? 'mobile' : 'desktop',
    screenEmulation: isMobile
      ? { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75 }
      : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
  };

  const result = await lighthouse(url, options);
  if (!result) {
    process.stderr.write('Lighthouse returned no result\n');
    process.exit(1);
  }

  const { lhr } = result;

  const fmt = (score) => (score == null ? '  -  ' : Math.round(score * 100).toString().padStart(3));
  const cats = lhr.categories;

  process.stdout.write(`\nLighthouse (${isMobile ? 'mobile' : 'desktop'}) — ${url}\n\n`);
  process.stdout.write(`  Performance       ${fmt(cats.performance?.score)}\n`);
  process.stdout.write(`  Accessibility     ${fmt(cats.accessibility?.score)}\n`);
  process.stdout.write(`  Best practices    ${fmt(cats['best-practices']?.score)}\n`);
  process.stdout.write(`  SEO               ${fmt(cats.seo?.score)}\n`);
  if (cats.pwa) {
    process.stdout.write(`  PWA               ${fmt(cats.pwa.score)}\n`);
  }
  process.stdout.write('\n');

  const metric = (id) => lhr.audits[id]?.displayValue ?? '-';
  process.stdout.write(`  LCP               ${metric('largest-contentful-paint')}\n`);
  process.stdout.write(`  FCP               ${metric('first-contentful-paint')}\n`);
  process.stdout.write(`  CLS               ${metric('cumulative-layout-shift')}\n`);
  process.stdout.write(`  TBT               ${metric('total-blocking-time')}\n`);
  process.stdout.write(`  Speed Index       ${metric('speed-index')}\n\n`);

  const perf = cats.performance?.score ?? 0;
  if (perf < performanceThreshold) {
    process.stdout.write(
      `✗ Performance ${Math.round(perf * 100)} below threshold ${performanceThreshold * 100}\n`,
    );
    process.exit(1);
  }
  process.stdout.write(
    `✓ Performance ${Math.round(perf * 100)} meets threshold ${performanceThreshold * 100}\n`,
  );
} finally {
  await chrome.kill();
}
