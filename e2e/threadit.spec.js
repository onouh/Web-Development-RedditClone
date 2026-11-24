import { test, expect } from '@playwright/test';
import {
  ensureScreenshotDir,
  expectClean,
  login,
  openPage,
  screenshotPath,
} from './helpers.js';

test.beforeAll(() => ensureScreenshotDir());

test('desktop shell: sticky bar, three columns, sidebar toggle, sorting and load more', async ({
  browser,
}) => {
  const { context, page, errors } = await openPage(browser, { label: 'desktop' });
  try {
    await login(page, 'alice_dev');

    const header = page.locator('header').first();
    await expect(header).toBeVisible();
    expect(await header.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');

    const navigation = page.getByRole('navigation', { name: 'Primary' });
    await expect(navigation).toBeVisible();
    const railHeading = page.getByText('Popular communities', { exact: true });
    await expect(railHeading).toBeVisible();

    const navBox = await navigation.boundingBox();
    const railBox = await railHeading.boundingBox();
    expect(railBox.x).toBeGreaterThan(navBox.x + navBox.width);

    await page.evaluate(() => window.scrollTo(0, 700));
    await expect(header).toBeInViewport();
    await page.evaluate(() => window.scrollTo(0, 0));

    const toggle = page.getByRole('button', { name: 'Toggle navigation' });
    await toggle.click();
    await expect(navigation).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(navigation).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const feedResponse = (fragment) =>
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/feed') &&
          response.url().includes('limit=10') &&
          response.url().includes(fragment),
      );

    let pending = feedResponse('sort=new');
    await page.getByRole('button', { name: 'New', exact: true }).click();
    await pending;
    await expect(page.getByRole('button', { name: 'New', exact: true })).toHaveClass(/bg-chip/);

    pending = feedResponse('sort=top');
    await page.getByRole('button', { name: /^Top/ }).click();
    await pending;

    pending = feedResponse('time=month');
    await page.getByRole('button', { name: 'This month', exact: true }).click();
    await pending;

    // Returning to Hot can be served from the fresh React Query cache, so only the
    // selected state and rendered posts are guaranteed — not a second network request.
    await page.getByRole('button', { name: 'Hot', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Hot', exact: true })).toHaveClass(/bg-chip/);
    await expect(page.locator('article').first()).toBeVisible();

    const loadMore = page.getByRole('button', { name: 'Load more posts' });
    await expect(loadMore).toBeVisible();
    const before = await page.locator('article').count();
    expect(before).toBe(10);

    pending = feedResponse('page=2');
    await loadMore.click();
    await pending;
    await expect.poll(() => page.locator('article').count()).toBeGreaterThan(before);
    await expect(loadMore).toHaveCount(0);
  } finally {
    expectClean(errors);
    await context.close();
  }
});

test('post votes: upvote, toggle off, downvote, then neutral; AI summary renders', async ({
  browser,
}) => {
  const { context, page, errors } = await openPage(browser, { label: 'vote-summary' });
  try {
    await login(page, 'alice_dev');

    const article = page.locator('article').first();
    await expect(article).toBeVisible();
    const upvote = article.getByRole('button', { name: 'Upvote', exact: true });
    const downvote = article.getByRole('button', { name: 'Downvote', exact: true });
    const scoreOf = async () => Number((await upvote.innerText()).replace(/[^\d-]/g, ''));
    const voteResponse = () =>
      page.waitForResponse(
        (response) => response.url().includes('/vote') && response.request().method() === 'PUT',
      );

    const initialVote =
      (await upvote.getAttribute('aria-pressed')) === 'true'
        ? 1
        : (await downvote.getAttribute('aria-pressed')) === 'true'
          ? -1
          : 0;

    // Normalise any vote left by an earlier run before measuring the baseline.
    if ((await upvote.getAttribute('aria-pressed')) === 'true') {
      const pending = voteResponse();
      await upvote.click();
      await pending;
    }
    if ((await downvote.getAttribute('aria-pressed')) === 'true') {
      const pending = voteResponse();
      await downvote.click();
      await pending;
    }
    await expect(upvote).toHaveAttribute('aria-pressed', 'false');
    await expect(downvote).toHaveAttribute('aria-pressed', 'false');
    const baseline = await scoreOf();

    let pending = voteResponse();
    await upvote.click();
    await pending;
    await expect(upvote).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(scoreOf).toBe(baseline + 1);

    pending = voteResponse();
    await upvote.click();
    await pending;
    await expect(upvote).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(scoreOf).toBe(baseline);

    pending = voteResponse();
    await downvote.click();
    await pending;
    await expect(downvote).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(scoreOf).toBe(baseline - 1);

    pending = voteResponse();
    await downvote.click();
    await pending;
    await expect(downvote).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(scoreOf).toBe(baseline);

    // Leave the seeded vote exactly as it was so repeat runs and screenshots stay stable.
    if (initialVote === 1) {
      pending = voteResponse();
      await upvote.click();
      await pending;
      await expect(upvote).toHaveAttribute('aria-pressed', 'true');
    } else if (initialVote === -1) {
      pending = voteResponse();
      await downvote.click();
      await pending;
      await expect(downvote).toHaveAttribute('aria-pressed', 'true');
    }

    const summaryButton = article.getByRole('button', { name: /^(Summarize|Summary)$/ });
    await summaryButton.click();
    const summaryLabel = article.getByText(/Auto summary|AI summary/);
    await expect(summaryLabel).toBeVisible();
    const summaryText = await summaryLabel.locator('..').locator('p').first().innerText();
    expect(summaryText.trim().length).toBeGreaterThan(20);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: screenshotPath('feed.png') });
  } finally {
    expectClean(errors);
    await context.close();
  }
});

test('post detail: nested thread collapses, expands and accepts a reply', async ({ browser }) => {
  const { context, page, errors } = await openPage(browser, { label: 'post-detail' });
  try {
    await login(page, 'alice_dev');

    const postTitle = 'What actually happens when two users upvote the same post at the same time?';
    await page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: postTitle }) })
      .getByRole('heading')
      .click();
    await expect(page).toHaveURL(/\/r\/[^/]+\/comments\/[a-f0-9]+/);
    await expect(page.getByRole('heading', { name: /\d+ comments/ })).toBeVisible();

    const seededReply =
      'Exactly. We treat duplicate key as a signal to re-read the existing vote and compute the delta, not as a user-facing 409.';
    const bobThread = page
      .getByRole('link', { name: 'u/bob_builder' })
      .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " text-sm ")][1]');
    await expect(bobThread.getByText(seededReply)).toBeVisible();

    await bobThread.getByRole('button', { name: 'Collapse thread' }).first().click();
    await expect(bobThread.getByRole('button', { name: 'Expand thread' }).first()).toBeVisible();
    await expect(bobThread.getByText(seededReply)).toBeHidden();

    await bobThread.getByRole('button', { name: 'Expand thread' }).first().click();
    await expect(bobThread.getByText(seededReply)).toBeVisible();

    await bobThread.getByRole('button', { name: 'Reply', exact: true }).first().click();
    const replyForm = page.locator('form').filter({ has: page.getByLabel('Reply text') });
    const replyText = 'Great point — the bounded retry budget is what makes this safe under load.';
    await replyForm.getByLabel('Reply text').fill(replyText);

    const posted = page.waitForResponse(
      (response) =>
        /\/api\/posts\/[a-f0-9]+\/comments$/.test(response.url()) &&
        response.request().method() === 'POST',
    );
    await replyForm.getByRole('button', { name: 'Reply', exact: true }).click();
    await posted;
    await expect(page.getByText(replyText)).toBeVisible();

    await page.getByText(replyText).scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await page.screenshot({ path: screenshotPath('post-comments.png') });
  } finally {
    expectClean(errors);
    await context.close();
  }
});

test('community join flips optimistically before the server responds', async ({ browser }) => {
  const { context, page, errors } = await openPage(browser, { label: 'join' });
  try {
    await login(page, 'alice_dev');
    await page.goto('/r/gaming');
    await expect(page.getByRole('heading', { level: 1, name: 'r/gaming' })).toBeVisible();

    const headerCard = page.locator('.card').first();
    await expect(headerCard.getByRole('button', { name: /^(Join|Joined)$/ }).first()).toBeVisible();

    const joinedButton = headerCard.getByRole('button', { name: 'Joined', exact: true });
    if ((await joinedButton.count()) > 0) {
      const left = page.waitForResponse(
        (response) =>
          response.url().includes('/api/communities/gaming/leave') &&
          response.request().method() === 'DELETE',
      );
      await joinedButton.click();
      await left;
    }
    const joinButton = headerCard.getByRole('button', { name: 'Join', exact: true });
    await expect(joinButton).toBeVisible();

    let releaseJoin;
    const holdJoin = new Promise((resolve) => {
      releaseJoin = resolve;
    });
    await page.route('**/api/communities/gaming/join', async (route) => {
      await holdJoin;
      await route.continue();
    });

    const joined = page.waitForResponse(
      (response) =>
        response.url().includes('/api/communities/gaming/join') &&
        response.request().method() === 'POST',
    );
    await joinButton.click();

    // The request is still held open here; the UI must already say Joined.
    await expect(headerCard.getByRole('button', { name: 'Joined', exact: true })).toBeVisible({
      timeout: 1_000,
    });
    releaseJoin();
    const joinedResponse = await joined;
    expect(joinedResponse.status()).toBe(200);
    await page.unroute('**/api/communities/gaming/join');

    const left = page.waitForResponse(
      (response) =>
        response.url().includes('/api/communities/gaming/leave') &&
        response.request().method() === 'DELETE',
    );
    await headerCard.getByRole('button', { name: 'Joined', exact: true }).click();
    await left;
    await expect(joinButton).toBeVisible();
  } finally {
    expectClean(errors);
    await context.close();
  }
});

test('two users exchange realtime chat messages; a comment notification arrives live', async ({
  browser,
}) => {
  const alice = await openPage(browser, { label: 'alice' });
  const bob = await openPage(browser, { label: 'bob' });
  try {
    await login(alice.page, 'alice_dev');
    await login(bob.page, 'bob_builder');

    await alice.page.getByRole('button', { name: 'Open chat' }).click();
    await bob.page.getByRole('button', { name: 'Open chat' }).click();
    await expect(alice.page.getByText('Chats', { exact: true })).toBeVisible();
    await expect(bob.page.getByText('Chats', { exact: true })).toBeVisible();

    await alice.page.getByRole('button', { name: /Bob Martinez/ }).first().click();
    await bob.page.getByRole('button', { name: /Alice Chen/ }).first().click();
    await expect(alice.page.getByLabel('Message', { exact: true })).toBeVisible();
    await expect(bob.page.getByLabel('Message', { exact: true })).toBeVisible();
    await expect(alice.page.getByText('No worries — see you at the demo!')).toBeVisible();
    await expect(bob.page.getByText('No worries — see you at the demo!')).toBeVisible();

    const fromAlice = 'Realtime check: can you see this without refreshing?';
    await alice.page.getByLabel('Message', { exact: true }).fill(fromAlice);
    await alice.page.getByRole('button', { name: 'Send message' }).click();
    await expect(alice.page.getByText(fromAlice)).toBeVisible();
    await expect(bob.page.getByText(fromAlice)).toBeVisible({ timeout: 10_000 });

    const fromBob = 'Yes — it arrived instantly in my session.';
    await bob.page.getByLabel('Message', { exact: true }).fill(fromBob);
    await bob.page.getByRole('button', { name: 'Send message' }).click();
    await expect(bob.page.getByText(fromBob)).toBeVisible();
    await expect(alice.page.getByText(fromBob)).toBeVisible({ timeout: 10_000 });

    await alice.page.screenshot({ path: screenshotPath('chat.png') });

    await alice.page.getByRole('button', { name: 'Close chat drawer' }).click();
    await alice.page.goto('/r/gaming');
    await expect(alice.page.getByRole('heading', { level: 1, name: 'r/gaming' })).toBeVisible();
    await alice.page
      .getByText('What is the most replayable game you own?', { exact: true })
      .click();
    await expect(alice.page.getByLabel('Comment text')).toBeVisible();

    const commentText =
      'Great breakdown — the retry loop is the part that makes this safe in production.';
    await alice.page.getByLabel('Comment text').fill(commentText);
    const commentPosted = alice.page.waitForResponse(
      (response) =>
        /\/api\/posts\/[a-f0-9]+\/comments$/.test(response.url()) &&
        response.request().method() === 'POST',
    );
    await alice.page.getByRole('button', { name: 'Comment', exact: true }).click();
    await commentPosted;
    await expect(alice.page.getByText(commentText)).toBeVisible();

    const bell = bob.page.getByRole('button', { name: /Notifications/ });
    await expect(bell).toHaveAttribute('aria-label', /unread/, { timeout: 10_000 });
    await bell.click();
    await expect(bob.page.getByText('alice_dev commented on your post').first()).toBeVisible();
  } finally {
    expectClean(alice.errors);
    expectClean(bob.errors);
    await alice.context.close();
    await bob.context.close();
  }
});

test('moderator AI rule check works and the theme toggles dark/light', async ({ browser }) => {
  const { context, page, errors } = await openPage(browser, { label: 'mod-theme' });
  try {
    await login(page, 'alice_dev');
    await page.goto('/r/webdev/mod');
    await expect(page.getByRole('heading', { name: 'Mod tools' })).toBeVisible();

    const draft = page.locator('textarea[placeholder^="Paste content here"]');
    await draft.fill(
      'You are an idiot and this post is trash. Personal attacks are fine and I will keep harassing people who disagree.',
    );
    const checked = page.waitForResponse(
      (response) =>
        response.url().includes('/api/ai/mod-check') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Check against rules' }).click();
    await checked;
    await expect(page.getByText(/Suggested:/)).toBeVisible();
    await page.screenshot({ path: screenshotPath('moderator.png') });

    await page.goto('/');
    await expect(page.locator('article').first()).toBeVisible();
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('button', { name: 'Dark mode' }).click();
    await page.getByRole('heading', { name: 'Home' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.waitForTimeout(200);
    await page.screenshot({ path: screenshotPath('dark-mode.png') });

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('button', { name: 'Light mode' }).click();
    await page.getByRole('heading', { name: 'Home' }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  } finally {
    expectClean(errors);
    await context.close();
  }
});

test('mobile viewport: single column, hidden rail and a working navigation drawer', async ({
  browser,
}) => {
  const { context, page, errors } = await openPage(browser, {
    viewport: { width: 390, height: 844 },
    label: 'mobile',
  });
  try {
    await login(page, 'alice_dev');

    const header = page.locator('header').first();
    await expect(header).toBeVisible();
    expect(await header.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');

    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden();
    await expect(page.getByText('Popular communities', { exact: true })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Toggle navigation' })).toBeVisible();

    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    expect(noOverflow).toBe(true);

    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    const drawer = page.locator('div.fixed.inset-0');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Navigation', { exact: true })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Home' })).toBeVisible();
    await drawer.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(drawer).toBeHidden();

    await page.screenshot({ path: screenshotPath('mobile.png') });
  } finally {
    expectClean(errors);
    await context.close();
  }
});
