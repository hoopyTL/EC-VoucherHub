#!/usr/bin/env -S npx tsx
/**
 * Crawl screenshots for the design-reviewer skill.
 *
 * Output: .design-review/shots/{route-slug}-{viewport}-{state}.png
 *       + .design-review/shots/{route-slug}-{viewport}-{state}.meta.json
 *
 * Usage:
 *   DESIGN_REVIEW_URL=http://localhost:PORT npx tsx .claude/skills/design-reviewer/scripts/crawl-screenshots.ts
 *
 * Stack-agnostic: the base URL comes from $DESIGN_REVIEW_URL (set it to runtime.base_url
 * from .claude/project.json). Routes and per-state seeding are project-specific, so they
 * are loaded from an OPTIONAL config file the design-reviewer skill writes per run:
 *
 *   .design-review/routes.json
 *   [
 *     {
 *       "path": "/",
 *       "slug": "home",
 *       "states": [
 *         { "name": "empty" },
 *         { "name": "with-data", "seedScript": "<JS run in the page to seed data via the app API/UI>" },
 *         { "name": "error",     "actionScript": "<JS run in the page to trigger an error state>" }
 *       ]
 *     }
 *   ]
 *
 * If the config file is absent, it falls back to crawling "/" in its default state only.
 * The seedScript/actionScript strings are evaluated in the page context (page.evaluate),
 * so the skill — which knows the project's real API/UI — supplies them. This file makes
 * NO assumption about the app's routes, endpoints, or data model.
 */

import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from '@playwright/test';

const BASE_URL = process.env.DESIGN_REVIEW_URL ?? 'http://localhost:3000';
const OUT_DIR = '.design-review/shots';
const ROUTES_CONFIG = '.design-review/routes.json';
const HEALTH_PATH = process.env.DESIGN_REVIEW_HEALTH ?? '/health';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

type StateSpec = {
  name: string;
  seedScript?: string;
  actionScript?: string;
};

type Route = {
  path: string;
  slug: string;
  states: ReadonlyArray<StateSpec>;
};

const DEFAULT_ROUTES: ReadonlyArray<Route> = [
  { path: '/', slug: 'home', states: [{ name: 'default' }] },
];

async function loadRoutes(): Promise<ReadonlyArray<Route>> {
  try {
    const raw = await readFile(ROUTES_CONFIG, 'utf8');
    const parsed = JSON.parse(raw) as Route[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // No config → default to crawling "/" only.
  }
  console.log(`No ${ROUTES_CONFIG} found — crawling "/" in default state only.`);
  return DEFAULT_ROUTES;
}

async function applyState(page: Page, state: StateSpec): Promise<void> {
  if (state.seedScript) {
    await page.evaluate(state.seedScript);
    await page.reload({ waitUntil: 'networkidle' });
  }
  if (state.actionScript) {
    await page.evaluate(state.actionScript);
  }
}

async function snap(page: Page, file: string): Promise<void> {
  await page.screenshot({ path: file, fullPage: true });
}

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  // Health check
  const probe = await fetch(`${BASE_URL}${HEALTH_PATH}`).catch(() => null);
  if (!probe || !probe.ok) {
    console.error(
      `FATAL: ${BASE_URL}${HEALTH_PATH} did not respond. Start the server before crawling.`,
    );
    process.exit(1);
  }

  const routes = await loadRoutes();

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch();
    const ctx = await browser.newContext();

    let count = 0;
    for (const vp of VIEWPORTS) {
      for (const route of routes) {
        for (const state of route.states) {
          const page = await ctx.newPage();
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle' });
          await applyState(page, state);
          // Let the DOM settle after setup (animation, fetch).
          await page.waitForTimeout(300);

          const stem = `${route.slug}-${vp.name}-${state.name}`;
          const png = join(OUT_DIR, `${stem}.png`);
          const meta = join(OUT_DIR, `${stem}.meta.json`);

          await snap(page, png);
          await writeFile(
            meta,
            JSON.stringify(
              {
                route: route.path,
                viewport: { name: vp.name, width: vp.width, height: vp.height },
                state: state.name,
                url: `${BASE_URL}${route.path}`,
                capturedAt: new Date().toISOString(),
              },
              null,
              2,
            ),
          );

          await page.close();
          count++;
          console.log(`✓ ${stem}`);
        }
      }
    }

    console.log(`\nDone. ${count} screenshots → ${OUT_DIR}/`);
  } finally {
    await browser?.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
