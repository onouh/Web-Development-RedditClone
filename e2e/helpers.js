import fs from 'node:fs';
import path from 'node:path';
import { expect } from '@playwright/test';

export const BASE_URL = 'http://127.0.0.1:5173';
export const PASSWORD = 'Password123!';
const SHOT_DIR = path.resolve('docs/screenshots');

export function ensureScreenshotDir() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
}

export const screenshotPath = (name) => path.join(SHOT_DIR, name);

const isLocal = (url) => url.startsWith(BASE_URL) || url.startsWith('http://localhost:5173');

/**
 * Fail the run on console errors, uncaught page errors, aborted local requests and any
 * local HTTP response >= 400. Navigation-cancelled requests (ERR_ABORTED) are ignored:
 * they are expected whenever the SPA changes route while a query is in flight.
 */
export function monitorPage(page, label) {
  const errors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`[${label}] console error: ${message.text()}`);
    }
  });

  page.on('pageerror', (error) => {
    errors.push(`[${label}] page error: ${error.message}`);
  });

  page.on('requestfailed', (request) => {
    if (!isLocal(request.url())) return;
    const failure = request.failure()?.errorText || 'unknown failure';
    if (failure.includes('ERR_ABORTED')) return;
    errors.push(`[${label}] request failed: ${request.method()} ${request.url()} (${failure})`);
  });

  page.on('response', (response) => {
    if (!isLocal(response.url())) return;
    if (response.status() >= 400) {
      errors.push(
        `[${label}] HTTP ${response.status()}: ${response.request().method()} ${response.url()}`,
      );
    }
  });

  return errors;
}

export async function openPage(
  browser,
  { viewport = { width: 1440, height: 900 }, label = 'page', as = 'alice' } = {},
) {
  const storageState = as ? path.resolve('e2e/.auth', `${as}.json`) : undefined;
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport,
    colorScheme: 'light',
    storageState,
  });
  const page = await context.newPage();
  const errors = monitorPage(page, label);
  if (storageState) {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
    await expect(page.locator('article').first()).toBeVisible();
  }
  return { context, page, errors };
}

export function expectClean(errors) {
  expect(errors, `Browser errors captured:\n${errors.join('\n')}`).toEqual([]);
}

export async function login(page, username) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Log in to Threadit' })).toBeVisible();
  await page.getByLabel('Username or email').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
  await expect(page.locator('article').first()).toBeVisible();
}
