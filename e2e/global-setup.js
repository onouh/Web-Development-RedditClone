import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { BASE_URL, PASSWORD } from './helpers.js';

const AUTH_DIR = path.resolve('e2e/.auth');

async function persistSession(browser, username, fileName) {
  const context = await browser.newContext({ baseURL: BASE_URL, colorScheme: 'light' });
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel('Username or email').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  const login = page.waitForResponse(
    (response) =>
      response.url().includes('/api/auth/login') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  const response = await login;
  if (!response.ok()) throw new Error(`Login failed for ${username}: HTTP ${response.status()}`);
  await page.getByRole('heading', { name: 'Home' }).waitFor();
  await context.storageState({ path: path.join(AUTH_DIR, fileName) });
  await context.close();
}

/**
 * One real UI login per seeded account, reused by tests through the refresh cookie.
 * This keeps the suite under the auth rate limit while still exercising the login form.
 */
export default async function globalSetup() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    await persistSession(browser, 'alice_dev', 'alice.json');
    await persistSession(browser, 'bob_builder', 'bob.json');
  } finally {
    await browser.close();
  }
}
