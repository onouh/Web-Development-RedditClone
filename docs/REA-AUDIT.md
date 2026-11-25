# REA Audit — Is Threadit a faithful reverse engineering of Reddit?

Audit date: **2026-11-25**
Tool: [`rea`](https://github.com/morluto/rea) `rea-agents@6.10.1` on Node `24.22.3` (darwin)
Browser: Chrome for Testing `159.0.8154.6`, headless, driven over CDP at `127.0.0.1:9222`

## Verdict

Threadit reproduces the **observable structure and behaviour** of Reddit's public community page: the same regions (top bar, primary navigation, feed of article cards, community rail), the same interactive vocabulary (vote pill, comment count, share, sort, join), and the same search/auth entry points. It does *not* reproduce Reddit's DOM, component names, class names or styling, and it is not claimed to.

This is **structural and behavioural parity**, not source-level equivalence. REA performs passive CDP inspection; it can prove what the clone renders and exposes, never that a particular upstream source file was copied.

## What REA was used for

REA is a passive inspection toolkit, not a test runner. In this audit it:

- attached to a real Chrome over CDP and captured the live DOM tree, accessibility tree, resource inventory and console metadata;
- reported the page without executing actions, mutating state, or reading authenticated data;
- produced comparable evidence bundles for a public Reddit page and for the running Threadit app, which were then compared field by field.

Behavioural claims (voting, joins, nested replies, realtime chat, moderator tooling, responsive layout) come from the Playwright walkthrough, not from REA — REA sees a snapshot, not a workflow.

## Targets and evidence

| Target | URL | Target ID | Evidence |
| --- | --- | --- | --- |
| Reddit r/webdev (archived) | `https://web.archive.org/web/20250527061510/https://www.reddit.com/r/webdev/` | `5F7D0A728DFC67C809AFDE5A3C78BD58` | `.tools/rea/evidence/reddit-archive-inspect.json` (971 KB), `reddit-rea.png` |
| Threadit Popular (guest) | `http://127.0.0.1:5173/popular` | `138C54CF1A699863DD2528B0CABD1A23` | `.tools/rea/evidence/threadit-inspect.json` (319 KB), `threadit-rea.png` |

Both `.json` bundles and decoded `.png` captures are under `.tools/`, which is gitignored; the findings are recorded here so the audit survives without them.

> Live `www.reddit.com` served a reCAPTCHA (`Reddit - Prove your humanity`), `r/webdev` redirected to a JavaScript challenge, and `old.reddit.com` redirected to login (`reason=lor2`). Those challenges were **not** bypassed. The Wayback Machine snapshot above was used instead and is the only Reddit evidence in this document.

## Quantitative comparison

Counts come from the two `normalized_result` bundles (`dom.nodes`, `accessibility.nodes`, `resources`).

| Signal | Reddit r/webdev (archived) | Threadit `/popular` |
| --- | --- | --- |
| Title | `webdev: reddit for web developers` | `Threadit — Dive into anything` |
| DOM nodes | 5,585 | 1,081 |
| Accessibility nodes | 1,389 | 998 |
| Resources | 235 | 13 |
| `banner` (header) | 1 | 1 |
| `main` | 1 | 1 (0 at capture — see *Differences*) |
| `navigation` | 3 | 1 |
| `complementary` (rails) | 3 | 2 |
| `article` (feed cards) | 3 | 10 |
| `button` | 4 | 76 |
| `link` | 50 | 58 |
| `heading` | 15 | 13 |
| `list` / `listitem` | 3 / 10 | 2 / 11 |
| `form` | 2 | 0 (search is a `search` landmark) |
| `searchbox` | 0 (`textbox` 2) | 1 (`Search communities and users`) |
| `image` | 47 | 96 |

Read the absolute numbers with care:

- the archived page carries a **Wayback toolbar** and a promoted ad, adding nodes that belong to the archive, not Reddit;
- Reddit builds its UI from **shadow-DOM custom elements** (`REDDIT-HEADER-LARGE`, `REDDIT-SEARCH-LARGE`, `FACEPLATE-PARTIAL`, `SHREDDIT-ASYNC-LOADER`, `FACEPLATE-TRACKER`, …), so much of its tree is slots and trackers rather than semantic elements, and its feed lazy-loads (only 3 `article`s present when the capture ended);
- Threadit is a flat React tree with semantic elements, so its 76 buttons are the vote/comment/share/save/join controls of ten fully rendered cards.

The comparison that matters is the **set of regions and controls**, not the node count.

## Feature-by-feature

| Reddit surface (observed via REA) | Threadit implementation | Evidence | Result |
| --- | --- | --- | --- |
| Top bar as `banner`: logo, search, Create, chat, Log In | `Navbar.jsx`: logo, `searchbox` "Search communities and users", Create, Open chat, Log in / Sign up | AX names on both; Playwright test 1 | Match |
| Primary left navigation: Home, Popular, topic groups, resources, Communities | `Sidebar.jsx`: Home, Popular, joined communities, popular communities, Create a community | `navigation` "Primary" on both | Match (single landmark, see *Differences*) |
| Feed of article cards: community, author, age, title, body preview | `PostCard.jsx` inside `PostList`: community icon, `u/author`, age, flair, title, preview | 10 `article` roles; AX heading list mirrors post titles | Match |
| Vote pill with score, up/down, comment count, Share, overflow menu | `VoteControl`, comment link, Share, `Post options` | AX names `Upvote`, `Downvote`, `Share`, `Post options`, `Summary`, `Save post` | Match |
| Sort control (`Best` disclosure on Reddit) | `SortBar`: Hot / New / Top + time window, `Load more posts` | AX names; Playwright test 1 switches New → Top | Match (segmented instead of dropdown) |
| Right rail: about/community info, bookmarks, promotion | `RightRail`: Popular communities with member counts, Create a community, Top this week, footer links | 2 `complementary`; AX headings `Popular communities`, `Top this week` | Match |
| Community header: banner, `r/webdev`, Create Post, Join, members / online / rank, rules & bookmarks | `Community.jsx`: banner, name, Join, sort, rules, member count | Not in either REA capture; Playwright test 4 (optimistic Join) + seed data | Match (verified behaviourally, not by snapshot) |
| Nested, collapsible comment threads (Reddit renders `details`/`summary`, 15 each) | `CommentTree.jsx` with materialised-path replies and collapse | Playwright test 3: seeded thread collapses/expands, real reply lands in tree | Match |
| Search entry point with scoped placeholder ("Search in r/webdev") | `SearchBar` + `/search` with Communities / People / Posts tabs and typeahead | `search` + `searchbox` landmarks; Vitest search assertions | Match |
| Log in / Sign up as plain links; guest feed | `/login`, `/register`; guests get a popular fallback feed | AX link names; Playwright test 1 logs in through the form | Match |
| Upvote/downvote correctness under concurrency (Reddit behaviour, not observable via DOM) | ACID vote service: unique index, single transaction, exact deltas, retries | Vitest 13/13, incl. 20-request same-user storm and 50-user storm | Match (server-side) |
| Realtime chat | Socket.IO DMs, presence, typing, unread; drawer + `/chat` | Playwright test 5 with two browser contexts | Additive (no public counterpart observed) |
| Moderator removal / reports / bans, AI summary, Mod-Assist | `/r/:name/mod`, reports queue, summaries with fallback | Playwright test 6; Vitest summary caching | Additive (Reddit equivalents are behind auth) |
| Responsive three-column → mobile drawer | `Layout` collapses the rail, opens a drawer under `lg` | Playwright test 7 at 390×844 | Match |

**12 of the 14 assignment requirements** map to an affordance observed on the public Reddit page. The two without a public counterpart (moderator removal UI, AI summarisation) are additive features on top of the reproduced surface.

## Differences found, and what changed

- **`main` landmark.** Reddit's capture exposes `role=main`; Threadit's layout rendered its outlet in a plain `div`, so the accessibility tree had no `main` role. Fixed: `client/src/components/Layout.jsx` now renders `<main>` around `<Outlet />` (same classes, no visual change). The Threadit evidence bundle predates this one-line fix, so its `main` count of 0 is expected; a fresh capture would show 1.
- **Landmark granularity.** Reddit exposes 3 `navigation` and 3 `complementary` landmarks (primary, resources, footer / entity panel, promotion, community info). Threadit exposes 1 and 2 respectively. Simpler, and intentional: the clone has one primary nav and two rails.
- **No custom elements.** Reddit's `SHREDDIT-*` / `FACEPLATE-*` / `REDDIT-*` components are its private UI platform. Threadit deliberately uses semantic HTML and Tailwind instead; reproducing the component names would be cosmetic mimicry with no behavioural value.
- **No skip-to-content link.** Reddit's first accessible link is "Skip to main content"; Threadit has none. Noted, not changed — outside the assignment's scope.

## Limitations

1. **The Reddit evidence is an archived snapshot** (27 May 2025), not today's live page. Reddit's current DOM may differ. The live site could not be inspected without solving a CAPTCHA or signing in, and neither was attempted.
2. **REA's policy filter removed cross-origin evidence.** Both bundles report `policy_filtered` with `attach_limited`; Reddit excluded 37 metadata events and 10 resources as `disallowed_origin`, Threadit excluded 5 metadata and 2 resources. Network request lists are empty for both because observation began after load and cross-origin traffic was excluded, so **no API/network comparison was made**.
3. **Guest view only for Threadit.** The REA capture is the signed-out Popular page; authenticated surfaces were exercised by Playwright instead.
4. **Snapshot ≠ behaviour.** REA proves rendered structure. All interaction claims rest on the Playwright suite and on Vitest.
5. **AI provider path not exercised.** With no `AI_API_KEY`, summaries and mod checks used the deterministic fallback; the same code path calls Gemini/OpenAI when a key is configured.
6. **No source-level claim.** Matching DOM regions and accessible names cannot establish that any Reddit source was reused, and none was.

## Reproducing this audit

```bash
# Supported runtime (Homebrew's node@24 was compiling deps from source)
.tools/node24/bin/node .tools/rea/node_modules/rea-agents/scripts/rea.mjs --version --json

# Headless Chrome with CDP
"/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" \
  --headless=new --remote-debugging-port=9222 \
  --user-data-dir=.tools/rea-profile about:blank

REA=".tools/node24/bin/node .tools/rea/node_modules/rea-agents/scripts/rea.mjs"

# Open a tab and read its target id
curl -s -X PUT "http://127.0.0.1:9222/json/new?<urlencoded-url>" | jq -r .id

# Passive capture (DOM + accessibility + resources + console metadata)
$REA inspect-web-page http://127.0.0.1:9222 <targetId> \
  --observation-ms 2500 --include-accessibility-text \
  --include-console-text --include-storage-keys --json

# Viewport screenshot artifact (PNG lives in normalized_result.artifact.data_base64)
$REA capture-web-screenshot http://127.0.0.1:9222 <targetId> --json
```

The app side must be running and seeded: `npm run seed -- --reset`, API on `127.0.0.1:5050`, Vite on `127.0.0.1:5173`.

## Conclusion

Against the strongest evidence available without bypassing Reddit's bot defences, Threadit is a **correct reverse engineering at the product level**: it presents the same information architecture, the same post/comment/vote affordances, and the same navigation and search entry points, with the interactions verified end to end (Playwright **7/7**) and the concurrency-sensitive vote engine proven under contention (Vitest **13/13**). The remaining differences are deliberate implementation choices (semantic HTML instead of Reddit's web components, a simpler landmark structure, different visual language) or additive features, not missing Reddit behaviour.
