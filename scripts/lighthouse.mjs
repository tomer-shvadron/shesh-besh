#!/usr/bin/env node
/**
 * Lighthouse — local-only convenience script.
 *
 * For CI gating use Lighthouse CI (`@lhci/cli`) via lighthouserc.json — that
 * is what runs in the GitHub Actions workflow. This script is for ad-hoc
 * developer runs against `pnpm preview` when you want a quick interactive
 * report without spinning up the LHCI tooling.
 *
 * Reports:
 *   Performance / Accessibility / Best-Practices / SEO    (0–100)
 *   LCP, CLS, TBT, FCP, Speed Index                       (lab values)
 *
 * Note: INP is *not* a lab metric — Lighthouse cannot measure it reliably
 * because it requires real user interactions across a full session. INP is
 * captured client-side via the `web-vitals` library (see
 * `src/services/webVitals.service.ts`) and reported in production / dev
 * via the browser console. Do not look for an INP number here.
 *
 * The PWA category was removed in Lighthouse 12 (May 2024); this script
 * does not request it.
 *
 * Usage:
 *   pnpm preview &                              # start the preview server
 *   node scripts/lighthouse.mjs                 # audit http://localhost:4173/shesh-besh/
 *   node scripts/lighthouse.mjs --url=http://localhost:5173/shesh-besh/
 *   node scripts/lighthouse.mjs --mobile        # emulate Moto G Power
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
const url = urlArg ? urlArg.slice('--url='.length) : 'http://localhost:4173/shesh-besh/';
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
    // PWA was removed in Lighthouse 12 (May 2024) — omit it from the request.
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
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
