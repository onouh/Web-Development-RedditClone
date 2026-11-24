# Team Contributions & Code Walkthrough Notes (Deliverable 4)

> **Human action required:** replace every `[Student Name]` / `[Student ID]` / `@[github-handle]` placeholder with the real team roster before submission, and confirm that each row matches the actual Git history. The Week 15 discussion is individual — everyone must be able to explain every file attributed to them.

## 1. Roster & ownership matrix

| Slot | Student name | Student ID | GitHub | Modules owned |
| --- | --- | --- | --- | --- |
| 1 · Tech lead / Auth | `[Student Name]` | `[Student ID]` | `@[handle]` | Auth, users, repo setup, deployment, reviews |
| 2 · Communities & moderation | `[Student Name]` | `[Student ID]` | `@[handle]` | Communities, join/leave, search, moderation |
| 3 · Posts, sorting & voting | `[Student Name]` | `[Student ID]` | `@[handle]` | Posts, feeds, pagination, **vote engine + stress tests** |
| 4 · Comments & threads | `[Student Name]` | `[Student ID]` | `@[handle]` | Nested comments, materialised path, comment UI |
| 5 · AI & API docs | `[Student Name]` | `[Student ID]` | `@[handle]` | AI summarization, thread TL;DR, mod-assist, Swagger/Postman |
| 6 · UI & realtime chat | `[Student Name]` | `[Student ID]` | `@[handle]` | Reddit shell, themes, Socket.IO chat, notifications |

## 2. Code ownership by file

### Member 1 — Authentication, profiles, deployment
- `server/src/models/User.js`
- `server/src/controllers/authController.js`, `userController.js`
- `server/src/middleware/auth.js`, `server/src/utils/tokens.js`
- `server/src/config/env.js`, `server/src/config/db.js`, `server/src/index.js`
- `client/src/context/AuthContext.jsx`, `client/src/pages/Login.jsx`, `Register.jsx`, `Profile.jsx`
- `client/src/lib/api.js` (token refresh), `render.yaml`, `client/vercel.json`, `.env.example`

**Walkthrough prompts**
1. Why is the access token kept in memory while the refresh token is an HTTP-only cookie? What changes when the SPA and API are on different domains?
2. Trace a request from `api()` through the 401 interceptor to `/auth/refresh` and back.
3. Where is bcrypt used, and why is `passwordHash` `select: false`?
4. How does the app behave if the MongoDB deployment is not a replica set?

### Member 2 — Communities, search & moderation
- `server/src/models/Community.js`, `Membership.js`, `Report.js`
- `server/src/controllers/communityController.js`, `searchController.js`, `moderationController.js`
- `server/src/routes/communityRoutes.js`
- `client/src/pages/Community.jsx`, `CreateCommunity.jsx`, `Search.jsx`
- `client/src/components/SearchBar.jsx`, `JoinButton.jsx`, `RightRail.jsx`

**Walkthrough prompts**
1. Walk through the transaction that creates a community, its first membership and `memberCount = 1`.
2. Why does a concurrent double-join produce one 200 and two 409s instead of `memberCount = 3`?
3. How does the typeahead query stay fast, and how is the user's search term protected from regex injection?
4. What happens to a banned user who is already a member?

### Member 3 — Posts, feeds & the voting engine
- `server/src/models/Post.js`, `Vote.js`
- `server/src/controllers/postController.js`, `voteController.js`
- `server/src/services/postService.js`, `voteService.js`
- `server/src/routes/postRoutes.js`
- `server/tests/vote.concurrency.test.js`
- `client/src/components/PostCard.jsx`, `VoteButtons.jsx`, `SortBar.jsx`, `PostList.jsx`
- `docs/database-schema.md`

**Walkthrough prompts**
1. Reproduce the vote delta table for `+1 → -1` and `+1 → +1`; why are the deltas `-2` and `-1`?
2. Why is a unique compound index not sufficient on its own? Why is a transaction not sufficient without `$inc`?
3. Which errors are retried, and why is retrying a `DuplicateKeyError` inside a transaction correct here?
4. Explain how the 20-request same-user storm can end at any score, yet still be correct.
5. What does “Hot” do differently from “Top”, and what are its scaling limits?

### Member 4 — Nested comments & comment voting
- `server/src/models/Comment.js`
- `server/src/controllers/commentController.js`
- `server/src/services/commentTree.js`
- `client/src/components/CommentTree.jsx`, `CommentForm.jsx`
- `client/src/pages/PostDetail.jsx` (comment section)

**Walkthrough prompts**
1. How do `ancestors` and `depth` make the tree fetch one indexed query instead of N+1 recursion?
2. Why are deleted leaf comments pruned while deleted parents remain as `[deleted]`?
3. How are comment votes routed through the same engine as posts, and where does comment karma change?
4. How does the recursive UI stop at depth 25, and how does collapse work?
5. Why increment `commentCount` in the same transaction as comment creation?

### Member 5 — AI features & API documentation
- `server/src/services/aiService.js`
- `server/src/controllers/aiController.js`; `summarize` in `postController.js`; `modCheck` in `moderationController.js`
- `server/src/docs/openapi.js`, `export-openapi.js`
- `server/docs/openapi.json`, `server/docs/postman_collection.json`
- `client` AI summary/TL;DR surfaces (`PostCard.jsx`, `PostDetail.jsx`)

**Walkthrough prompts**
1. Walk through the cache check (`contentHash`) and what invalidates a summary when a post is edited.
2. What does the app do when `AI_API_KEY` is missing or the provider times out? Show the fallback path.
3. How is prompt injection from post content mitigated?
4. What rate limit applies to AI endpoints, and how is the key kept out of the browser?
5. Where does the thread digest cache live, and what key does it use?

### Member 6 — UI system, realtime chat & notifications
- `client/src/components/Navbar.jsx`, `Sidebar.jsx`, `Layout.jsx`, `ChatDrawer.jsx`, `ChatParts.jsx`, `NotificationsMenu.jsx`
- `client/src/pages/Chat.jsx`; `client/src/context/ChatContext.jsx`, `SocketContext.jsx`, `ThemeContext.jsx`
- `client/src/index.css`, `tailwind.config.js`
- `server/src/sockets/index.js`, `server/src/services/chatService.js`, `notificationService.js`
- `server/src/models/Conversation.js`, `Message.js`, `Notification.js`

**Walkthrough prompts**
1. How does the Socket.IO handshake authenticate, and what happens to an expired token?
2. Trace a message from composer → socket ack → MongoDB → conversation room + each participant’s user room → React state.
3. How are unread counts computed, and how do they reset?
4. Why are `typing:*` events broadcast to the room but not persisted?
5. How do the light/dark tokens map to Reddit’s palette, and how is the theme persisted before React boots?

## 3. Shared responsibilities

| Area | Primary | Reviewer |
| --- | --- | --- |
| `.env.example` / secret hygiene | Member 1 | Member 5 |
| OpenAPI ↔ route parity | Member 5 | Member 3 |
| Seed demo data (`server/src/seed.js`) | Member 6 | Member 2 |
| Concurrency sign-off log | Member 3 | Member 1 |
| Cross-device UI audit | Member 6 | Member 4 |

## 4. Verification log (fill after the Week 14 run)

- [ ] `npm test` passes locally (paste the Vitest output / CI link): `[link or date]`
- [ ] Concurrent-vote stress test executed against staging Atlas: `[date · result]`
- [ ] Every Swagger endpoint exercised against staging: `[date · notes]`
- [ ] Deployed URL tested on desktop + mobile, light + dark: `[URL · browsers]`

## 5. Academic integrity note

The Week 15 discussion grades each student individually. Before the discussion, each member must be able to:

1. Open their owned files and explain the data flow without notes.
2. Explain one bug they fixed and how they found it.
3. Explain how their module interacts with at least two other modules.
4. Reproduce the concurrency argument for voting and the authorization rules for their endpoints.
