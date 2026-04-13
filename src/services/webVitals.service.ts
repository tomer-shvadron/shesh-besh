import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

import type { Metric } from 'web-vitals';

/**
 * Core Web Vitals reporter.
 *
 * Hooks into the `web-vitals` library (v4) and records the five metrics
 * Google actually ranks on:
 *   - LCP   — Largest Contentful Paint            (loading)          <= 2.5s
 *   - INP   — Interaction to Next Paint           (responsiveness)   <= 200ms
 *   - CLS   — Cumulative Layout Shift             (visual stability) <= 0.1
 *   - FCP   — First Contentful Paint              (informational)
 *   - TTFB  — Time to First Byte                  (informational)
 *
 * INP is the critical one for this canvas-heavy PWA: it measures the p75
 * latency of *every* user interaction (click, tap, key) across the full
 * session. Lighthouse cannot measure INP because it clicks once at load
 * and stops — the only way to track INP is client-side like this.
 *
 * In development: logs to the console and exposes the last-seen metric
 *   on `window.__WEB_VITALS__` for debugging and E2E introspection.
 * In production: still logs (sparingly, once per metric settle) and the
 *   window hook is still available. If/when we want a backend, swap the
 *   `report()` body for a `navigator.sendBeacon(endpoint, body)` call —
 *   beacon is specifically designed for this.
 */

export type WebVitalName = 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB';

export interface WebVitalSample {
  name: WebVitalName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  id: string;
}

type WindowWithVitals = typeof window & {
  __WEB_VITALS__?: Record<WebVitalName, WebVitalSample | undefined>;
};

function report(metric: Metric): void {
  const sample: WebVitalSample = {
    name: metric.name as WebVitalName,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
  };

  // Stash on window so devs / E2E can read the latest values.
  const win = window as WindowWithVitals;
  if (!win.__WEB_VITALS__) {
    win.__WEB_VITALS__ = {} as Record<WebVitalName, WebVitalSample | undefined>;
  }
  win.__WEB_VITALS__[sample.name] = sample;

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(
      `[web-vitals] ${sample.name}: ${sample.value.toFixed(2)} (${sample.rating})`,
    );
  }
}

/**
 * Register the reporters. Idempotent — safe to call once from the app
 * entry point. Subsequent calls are no-ops because each `on*` attaches
 * its own PerformanceObserver; the library guards against double-init
 * only if we wrap it, so we track registration ourselves.
 */
let registered = false;
export function registerWebVitals(): void {
  if (registered) {
    return;
  }
  registered = true;

  onLCP(report);
  onINP(report);
  onCLS(report);
  onFCP(report);
  onTTFB(report);
}
