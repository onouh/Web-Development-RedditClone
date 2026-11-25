# REA Audit — Is Threadit a faithful reverse engineering of Reddit?

Audit date: **2026-11-25**
Tool: [`rea`](https://github.com/morluto/rea) `rea-agents@6.10.1` on Node `24.22.3` (darwin)
Browser: Chrome for Testing `159.0.8154.6`, headless, driven over CDP at `127.0.0.1:9222`

## Verdict

Threadit reproduces the **observable structure and behaviour** of Reddit's public community page: the same regions (top bar, primary navigation, feed of article cards, community rail), the same interactive vocabulary (vote pill, comment count, share, sort, join), and the same search/auth entry points. It does *not* reproduce Reddit's DOM, component names, class names or styling, and it is not claimed to.

Five captures back this up: Reddit's archived community feed and post page, and the clone's `/popular`, `/r/webdev` and post-detail routes, so the community header, rules and moderator list are compared directly rather than inferred from the feed, and the comment thread is captured on the clone side (Reddit's archived comments did not load — see *Limitations*).

This is **structural and behavioural parity**, not source-level equivalence. REA performs passive CDP inspection; it can prove what the clone renders and exposes, never that a particular upstream source file was copied.

## What REA was used for

REA is a passive inspection toolkit, not a test runner. In this audit it:

- attached to a real Chrome over CDP and captured the live DOM tree, accessibility tree, resource inventory and console metadata;
- reported the page without executing actions, mutating state, or reading authenticated data;
- produced comparable evidence bundles for public Reddit pages (community feed and post detail) and for three routes of the running Threadit app, which were then compared field by field.

Behavioural claims (voting, joins, nested replies, realtime chat, moderator tooling, responsive layout) come from the Playwright walkthrough, not from REA — REA sees a snapshot, not a workflow.

## Targets and evidence

| Target | URL | Target ID | Evidence |
| --- | --- | --- | --- |
| Reddit r/webdev (archived) | `https://web.archive.org/web/20250527061510/https://www.reddit.com/r/webdev/` | `5F7D0A728DFC67C809AFDE5A3C78BD58` | `docs/rea-evidence/reddit-archive-inspect.json` (971 KB), `docs/rea-evidence/reddit-rea.png` |
| Threadit Popular (guest, recaptured after the fix) | `http://127.0.0.1:5173/popular` | `CCC1D0FECA2B88542FB8DBB45B31D367` | `docs/rea-evidence/threadit-postfix-inspect.json` (296 KB), `docs/rea-evidence/threadit-postfix-rea.png` |
| Threadit community (guest) | `http://127.0.0.1:5173/r/webdev` | `A2064C2471B4675881C5588BD4F5DD4A` | `docs/rea-evidence/threadit-community-inspect.json` (176 KB), `docs/rea-evidence/threadit-community-rea.png` |
| Threadit post detail (guest) | `http://127.0.0.1:5173/r/webdev/comments/6b0707e87bbe4196d2cbf7ab` | `EE01B6B9997C28A32C53244ADF434611` | `docs/rea-evidence/threadit-post-inspect.json` (204 KB), `docs/rea-evidence/threadit-post-rea.png` |
| Reddit post + community header (archived) | `https://web.archive.org/web/20250527052034/https://www.reddit.com/r/webdev/comments/1kwe45l/the_skills_no_one_teaches_engineers_mindset/` | `0E4F7E3A7B9DE0E540705E08917B2317` | `docs/rea-evidence/reddit-post-inspect.json` (1,019 KB), `docs/rea-evidence/reddit-post-rea.png` |

Every capture above is committed under `docs/rea-evidence/`, so the counts in this document can be re-derived from the repository alone: `dom.nodes`, `accessibility.nodes`, `resources` and `console.events` are read straight out of each `*-inspect.json`, and each `*-rea.png` is the viewport image decoded from the corresponding `capture-web-screenshot` result. The pre-fix Threadit bundle is committed alongside them as `docs/rea-evidence/threadit-inspect.json` (target `138C54CF1A699863DD2528B0CABD1A23`) so the effect of the landmark fix can be checked directly.

> Live `www.reddit.com` served a reCAPTCHA (`Reddit - Prove your humanity`), `r/webdev` redirected to a JavaScript challenge, and `old.reddit.com` redirected to login (`reason=lor2`). Those challenges were **not** bypassed. The Wayback Machine snapshot above was used instead and is the only Reddit evidence in this document.

## Quantitative comparison

Counts come from the `normalized_result` bundles (`dom.nodes`, `accessibility.nodes`, `resources`).

| Signal | Reddit r/webdev (archived) | Threadit `/popular` |
| --- | --- | --- |
| Title | `webdev: reddit for web developers` | `Threadit — Dive into anything` |
| DOM nodes | 5,585 | 1,002 |
| Accessibility nodes | 1,389 | 899 |
| Resources | 235 | 13 |
| `banner` (header) | 1 | 1 |
| `main` | 1 | 1 |
| `navigation` | 3 | 1 |
| `complementary` (rails) | 3 | 2 |
| `article` (feed cards) | 3 | 10 |
| `button` | 4 | 76 |
| `link` | 50 | 53 |
| `heading` | 15 | 12 |
| `list` / `listitem` | 3 / 10 | 1 / 6 |
| `form` | 2 | 0 (search is a `search` landmark) |
| `searchbox` | 0 (`textbox` 2) | 1 (`Search communities and users`) |
| `image` | 47 | 91 |

The Threadit column is the post-fix bundle. The fix itself cannot change the node count (`div` → `main` is a rename), but these numbers differ slightly from the pre-fix bundle because the page loads asynchronously and the rails differ by route: the pre-fix bundle contains a "Top this week" section, which only `Home.jsx` renders, so the two captures were not of the identical rail state. Region for region they match.

Read the absolute numbers with care:

- the archived page carries a **Wayback toolbar** and a promoted ad, adding nodes that belong to the archive, not Reddit;
- Reddit builds its UI from **shadow-DOM custom elements** (`REDDIT-HEADER-LARGE`, `REDDIT-SEARCH-LARGE`, `FACEPLATE-PARTIAL`, `SHREDDIT-ASYNC-LOADER`, `FACEPLATE-TRACKER`, …), so much of its tree is slots and trackers rather than semantic elements, and its feed lazy-loads (only 3 `article`s present when the capture ended);
- Threadit is a flat React tree with semantic elements, so its 76 buttons are the vote/comment/share/save/join controls of ten fully rendered cards.

The comparison that matters is the **set of regions and controls**, not the node count.

The fresh Threadit console was also clean: Vite's connect banner, the React DevTools notice and two React Router v7 future-flag warnings, with **no errors and no failed local requests**. Reddit's console evidence was excluded by REA's origin policy (`disallowed_origin`), so no equivalent statement is possible for the archived page.

## Community page and post detail

`/popular` is only the feed. These captures cover the surfaces it cannot show: the community header with its rules and moderators, and the post page with its comment thread.

| Signal | Reddit feed (archived) | Reddit post (archived) | Threadit `/r/webdev` | Threadit post |
| --- | --- | --- | --- | --- |
| DOM nodes | 5,585 | 5,387 | 527 | 627 |
| Accessibility nodes | 1,389 | 1,167 | 482 | 597 |
| `article` | 3 | 0 (`SHREDDIT-POST`) | 3 | 1 |
| `heading` | 15 | 1 (`Post Title: …`) | 7 | 6 |
| `button` | 4 | 10 | 32 | 41 |
| `link` | 50 | 38 | 26 | 27 |
| `banner` / `main` / `navigation` | 1 / 1 / 3 | 1 / 1 / 3 | 1 / 1 / 1 | 1 / 1 / 1 |
| `complementary` | 3 | 3 | 2 | 2 |
| `list` / `listitem` | 3 / 10 | 3 / 9 | 2 / 5 | 2 / 5 |
| `details` / `summary` | 15 / 15 | 8 / 8 | 0 / 0 | 0 / 0 |
| Console errors | excluded | 0 | 0 | 0 |

### Community header

Reddit's archived community page exposes the identity in a heading (`r/webdev`), a Join action in the masthead, a banner, and an about rail (`Community information`) carrying the description, creation date, public status, member/online counts and size rank, with `RULES`, `MODERATORS`, `COMMUNITY BOOKMARKS`, `LINKS` and `RELATED COMMUNITES` sections.

Threadit's `/r/webdev` capture matches that shape at the level of information and controls: a header card with the avatar, `r/webdev`, `Web Development · 5 members` and a **Join** button; flair filters (`All posts`, `Discussion`, `Help`, `Showcase`, `News`); and a rail with the description, `Members` and `Created` definition pairs, four numbered **Community rules** and a **Moderators** list (`u/alice_dev`). On the clone, both the community and post routes expose one `main`, one `banner` and two `complementary` regions.

Differences are scope, not omission: Threadit has no bookmarks / related-communities / size-rank block, and its rules are list text under one heading rather than Reddit's one-heading-per-rule pattern.

### Post page and comment thread

Threadit's post capture renders the post as a single `article` with the title as a heading, the vote pill, comment count, Share, Save and Summary controls, a **Thread TL;DR** card, then `6 comments` with a `Newest first` combobox, a guest `Log in to join the conversation.` prompt, and the tree itself: author, `OP` / `MOD` badges, age, body, and per-comment `Collapse thread`, `Comment options` and `Reply` controls (six of the first two, eighteen `Reply` controls across the nested replies).

Reddit's archived counterpart was captured too, and it shows the header, post body, `Share`, and the community about panel — but **its comment subtree never populated**. The archive left a loader placeholder below the post (no comment element, no comment text in the DOM or the fetched page), so the Reddit half of the comment comparison is unavailable; only the clone's thread structure is evidenced here. Reddit's collapsing idiom is present page-wide as native `details`/`summary` pairs (8 on the post page, 15 on the community feed).

## Feature-by-feature

| Reddit surface (observed via REA) | Threadit implementation | Evidence | Result |
| --- | --- | --- | --- |
| Top bar as `banner`: logo, search, Create, chat, Log In | `Navbar.jsx`: logo, `searchbox` "Search communities and users", Create, Open chat, Log in / Sign up | AX names on both; Playwright test 1 | Match |
| Primary left navigation: Home, Popular, topic groups, resources, Communities | `Sidebar.jsx`: Home, Popular, joined communities, popular communities, Create a community | `navigation` "Primary" on both | Match (single landmark, see *Differences*) |
| Feed of article cards: community, author, age, title, body preview | `PostCard.jsx` inside `PostList`: community icon, `u/author`, age, flair, title, preview | 10 `article` roles; AX heading list mirrors post titles | Match |
| Vote pill with score, up/down, comment count, Share, overflow menu | `VoteControl`, comment link, Share, `Post options` | AX names `Upvote`, `Downvote`, `Share`, `Post options`, `Summary`, `Save post` | Match |
| Sort control (`Best` disclosure on Reddit) | `SortBar`: Hot / New / Top + time window, `Load more posts` | AX names; Playwright test 1 switches New → Top | Match (segmented instead of dropdown) |
| Right rail: about/community info, bookmarks, promotion | `RightRail`: Popular communities with member counts and Create a community on `/popular`; Home adds Top this week; footer links | 2 `complementary`; AX heading `Popular communities` | Match |
| Community header: banner, `r/webdev`, Create Post, Join, members / online / rank, rules & bookmarks | `Community.jsx`: header card (avatar, name, member count, Join), flair filters, about rail with description, Members, Created, Community rules, Moderators | Community capture: `h1` r/webdev, Join button, `Community rules`, `Moderators`; Playwright test 4 (optimistic Join) | Match on identity, join, rules and moderators; no bookmarks/related-communities block (deliberate) |
| Nested, collapsible comment threads (Reddit uses `details`/`summary` disclosures) | `CommentTree.jsx`: `6 comments`, per-comment Collapse thread / Comment options / Reply, OP and MOD badges, indented nesting, `Newest first` sort | Post capture: 6 `Collapse thread`, 6 `Comment options`, 18 `Reply`, 1 `combobox`; Reddit archive's comment subtree never populated (see *Limitations*); Playwright test 3 collapses, expands and posts a reply | Match on the clone side; Reddit comment content unavailable |
| Search entry point with scoped placeholder ("Search in r/webdev") | `SearchBar` + `/search` with Communities / People / Posts tabs and typeahead | `search` + `searchbox` landmarks; Vitest search assertions | Match |
| Log in / Sign up as plain links; guest feed | `/login`, `/register`; guests get a popular fallback feed | AX link names; Playwright test 1 logs in through the form | Match |
| Upvote/downvote correctness under concurrency (Reddit behaviour, not observable via DOM) | ACID vote service: unique index, single transaction, exact deltas, retries | Vitest 13/13, incl. 20-request same-user storm and 50-user storm | Match (server-side) |
| Realtime chat | Socket.IO DMs, presence, typing, unread; drawer + `/chat` | Playwright test 5 with two browser contexts | Additive (no public counterpart observed) |
| Moderator removal / reports / bans, AI summary, Mod-Assist | `/r/:name/mod`, reports queue, summaries with fallback | Playwright test 6; Vitest summary caching | Additive (Reddit equivalents are behind auth) |
| Responsive three-column → mobile drawer | `Layout` collapses the rail, opens a drawer under `lg` | Playwright test 7 at 390×844 | Match |

**12 of the 14 assignment requirements** map to an affordance observed on the public Reddit page. The two without a public counterpart (moderator removal UI, AI summarisation) are additive features on top of the reproduced surface.

## Differences found, and what changed

- **`main` landmark.** Reddit's capture exposes `role=main`; Threadit's layout rendered its outlet in a plain `div`, so the accessibility tree had no `main` role. Fixed: `client/src/components/Layout.jsx` now renders `<main>` around `<Outlet />` (same classes, no visual change). The pre-fix bundle recorded `main` 0; the fresh capture records exactly one `main` role and one `MAIN` element, with `banner`, `navigation` and both `complementary` rails unchanged.
- **Landmark granularity.** Reddit exposes 3 `navigation` and 3 `complementary` landmarks (primary, resources, footer / entity panel, promotion, community info). Threadit exposes 1 and 2 respectively. Simpler, and intentional: the clone has one primary nav and two rails.
- **No custom elements.** Reddit's `SHREDDIT-*` / `FACEPLATE-*` / `REDDIT-*` components are its private UI platform. Threadit deliberately uses semantic HTML and Tailwind instead; reproducing the component names would be cosmetic mimicry with no behavioural value.
- **No skip-to-content link.** Reddit's first accessible link is "Skip to main content"; Threadit has none. Noted, not changed — outside the assignment's scope.
- **Collapsing idiom.** Reddit collapses with native `details`/`summary` (15 pairs on the community feed, 8 on the post page); Threadit uses labelled buttons (`Collapse thread`) over React state. Behaviour is equivalent and exercised by Playwright, but the clone's control announces as a button rather than a disclosure triangle. Not changed.

## Limitations

1. **The Reddit evidence is an archived snapshot** (27 May 2025), not today's live page. Reddit's current DOM may differ. The live site could not be inspected without solving a CAPTCHA or signing in, and neither was attempted.
2. **REA's policy filter removed cross-origin evidence.** Every bundle reports `policy_filtered` with `attach_limited`; Reddit excluded 37 metadata events and 10 resources as `disallowed_origin`, Threadit excluded 5 metadata and 2 resources. Network request lists are empty throughout because observation began after load and cross-origin traffic was excluded, so **no API/network comparison was made**.
3. **Guest view only for Threadit.** All three clone captures are signed out (`/popular`, `/r/webdev`, post detail); authenticated surfaces were exercised by Playwright instead. Counts are one moment per route, and they move with asynchronous feed/rail loading (the Home rail carries an extra "Top this week" section that `/popular` does not), so treat single-digit differences between runs as timing, not structure.
4. **The archived Reddit thread has no comments.** The post body, community header and Share control rendered, but the comment subtree never populated — no comment element, no comment text in the DOM or the fetched page, only a loader placeholder below the post. Comment content, nesting and voting therefore could not be compared against Reddit; the thread evidence in this audit is the clone's capture plus Playwright test 3, and Reddit's collapse idiom is inferred from the `details`/`summary` pairs present on its pages.
5. **Snapshot ≠ behaviour.** REA proves rendered structure. All interaction claims rest on the Playwright suite and on Vitest.
6. **AI provider path not exercised.** With no `AI_API_KEY`, summaries and mod checks used the deterministic fallback; the same code path calls Gemini/OpenAI when a key is configured.
7. **No source-level claim.** Matching DOM regions and accessible names cannot establish that any Reddit source was reused, and none was.

## Reproducing this audit

```bash
# Supported runtime (Homebrew's node@24 was compiling deps from source)
.tools/node24/bin/node .tools/rea/node_modules/rea-agents/scripts/rea.mjs --version --json

# Headless Chrome with CDP
# Resolve the Chrome for Testing binary Playwright installed, then serve CDP on 9222.
CHROME="$(node -e "process.stdout.write(require('playwright').chromium.executablePath())")"
"$CHROME" --headless=new --remote-debugging-port=9222 \
  --user-data-dir=.tools/rea-profile about:blank

REA=".tools/node24/bin/node .tools/rea/node_modules/rea-agents/scripts/rea.mjs"

# Open a tab and read its target id
curl -s -X PUT "http://127.0.0.1:9222/json/new?<urlencoded-url>" | jq -r .id

# Passive capture (DOM + accessibility + resources + console metadata).
# Redirect into docs/rea-evidence/ so the bundle is tracked with this audit.
$REA inspect-web-page http://127.0.0.1:9222 <targetId> \
  --observation-ms 2500 --include-accessibility-text \
  --include-console-text --include-storage-keys --json

# Viewport screenshot artifact (PNG lives in normalized_result.artifact.data_base64)
$REA capture-web-screenshot http://127.0.0.1:9222 <targetId> --json
```

The app side must be running and seeded: `npm run seed -- --reset`, API on `127.0.0.1:5050`, Vite on `127.0.0.1:5173`.

## Conclusion

Against the strongest evidence available without bypassing Reddit's bot defences, Threadit is a **correct reverse engineering at the product level**: it presents the same information architecture, the same post/comment/vote affordances, and the same navigation and search entry points, with the interactions verified end to end (Playwright **7/7**) and the concurrency-sensitive vote engine proven under contention (Vitest **13/13**). The remaining differences are deliberate implementation choices (semantic HTML instead of Reddit's web components, a simpler landmark structure, different visual language) or additive features, not missing Reddit behaviour.
