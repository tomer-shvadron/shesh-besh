#!/usr/bin/env node
/**
 * Listener / observer audit script.
 *
 * Walks every .ts / .tsx file under `src/` and ensures that each
 *   - addEventListener(…) call
 *   - new ResizeObserver(…)   /   new MutationObserver(…)   /   new IntersectionObserver(…)
 * has a matching cleanup call (removeEventListener / .disconnect() / .unobserve())
 * in the same file.
 *
 * This is a heuristic (regex-based) tool, not a full AST analysis: it errs on
 * the side of *flagging* potential leaks so they can be manually reviewed.
 *
 * Exit code:
 *   0 — all files balanced
 *   1 — at least one file has more additions than cleanups (likely leak)
 *
 * Usage:
 *   node scripts/audit-listeners.mjs           # audit src/
 *   node scripts/audit-listeners.mjs --json    # machine-readable output
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const srcDir = join(root, 'src');

const JSON_OUTPUT = process.argv.includes('--json');

/** Recursively collect .ts / .tsx source files (excluding test files). */
function collectSourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') {
        continue;
      }
      out.push(...collectSourceFiles(p));
      continue;
    }
    if (!entry.endsWith('.ts') && !entry.endsWith('.tsx')) {
      continue;
    }
    if (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) {
      continue;
    }
    out.push(p);
  }
  return out;
}

const countMatches = (src, re) => (src.match(re) ?? []).length;

function auditFile(path) {
  const src = readFileSync(path, 'utf8');

  const addListenerCount = countMatches(src, /\.addEventListener\s*\(/g);
  const removeListenerCount = countMatches(src, /\.removeEventListener\s*\(/g);

  const resizeNew = countMatches(src, /new\s+ResizeObserver\s*\(/g);
  const mutationNew = countMatches(src, /new\s+MutationObserver\s*\(/g);
  const intersectionNew = countMatches(src, /new\s+IntersectionObserver\s*\(/g);
  const observerCount = resizeNew + mutationNew + intersectionNew;
  const disconnectCount = countMatches(src, /\.disconnect\s*\(\s*\)/g);

  const issues = [];

  if (addListenerCount > removeListenerCount) {
    issues.push({
      kind: 'event-listener',
      adds: addListenerCount,
      removes: removeListenerCount,
      missing: addListenerCount - removeListenerCount,
    });
  }

  if (observerCount > disconnectCount) {
    issues.push({
      kind: 'observer',
      news: observerCount,
      disconnects: disconnectCount,
      missing: observerCount - disconnectCount,
    });
  }

  return issues;
}

function main() {
  const files = collectSourceFiles(srcDir);
  const report = [];

  for (const f of files) {
    const issues = auditFile(f);
    if (issues.length > 0) {
      report.push({ file: relative(root, f), issues });
    }
  }

  if (JSON_OUTPUT) {
    process.stdout.write(`${JSON.stringify({ files: files.length, issues: report }, null, 2)}\n`);
  } else {
    process.stdout.write(`Scanned ${files.length} files under src/\n`);
    if (report.length === 0) {
      process.stdout.write('✓ no unmatched listeners / observers found\n');
    } else {
      process.stdout.write(`✗ ${report.length} file(s) have unmatched listener/observer counts:\n\n`);
      for (const { file, issues } of report) {
        process.stdout.write(`  ${file}\n`);
        for (const issue of issues) {
          if (issue.kind === 'event-listener') {
            process.stdout.write(
              `    · addEventListener×${issue.adds}, removeEventListener×${issue.removes} ` +
                `(missing ${issue.missing})\n`,
            );
          } else {
            process.stdout.write(
              `    · new *Observer×${issue.news}, disconnect()×${issue.disconnects} ` +
                `(missing ${issue.missing})\n`,
            );
          }
        }
      }
      process.stdout.write('\n');
    }
  }

  process.exit(report.length === 0 ? 0 : 1);
}

main();
