# Database Schema Diagram (Deliverable 2)

MongoDB document model for **Threadit**. Every collection uses ObjectId primary keys. The `votes` collection is separate from posts/comments on purpose: a unique compound index is the storage-level guarantee behind the “one vote per user per target” rule.

![Threadit MongoDB schema](database-schema.svg)

> The SVG above is generated from `scripts/render-schema.mjs` with `npm run schema:svg`; the Mermaid source below renders directly on GitHub.

## ERD (Mermaid)

```mermaid
erDiagram
    USERS ||--o{ POSTS : authors
    USERS ||--o{ COMMENTS : authors
    USERS ||--o{ MEMBERSHIPS : joins
    USERS ||--o{ VOTES : casts
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ MESSAGES : sends
    COMMUNITIES ||--o{ MEMBERSHIPS : has
    COMMUNITIES ||--o{ POSTS : contains
    COMMUNITIES ||--o{ REPORTS : receives
    POSTS ||--o{ COMMENTS : contains
    POSTS ||--o{ VOTES : "target (polymorphic)"
    COMMENTS ||--o{ COMMENTS : "parent of"
    COMMENTS ||--o{ VOTES : "target (polymorphic)"
    CONVERSATIONS ||--o{ MESSAGES : contains
    USERS }o--o{ CONVERSATIONS : participates

    USERS {
        ObjectId _id PK
        string username UK "lowercase, 3-20"
        string email UK "lowercase"
        string passwordHash "bcrypt, select:false"
        string displayName
        string bio
        string avatarUrl
        string bannerUrl
        int postKarma
        int commentKarma
        ObjectId[] savedPosts FK
        datetime createdAt
    }

    COMMUNITIES {
        ObjectId _id PK
        string name UK "lowercase"
        string title
        string description
        string iconUrl
        string bannerUrl
        ObjectId creatorId FK
        ObjectId[] moderators FK
        object[] rules "title, description"
        object[] flairs "label, color"
        ObjectId[] bannedUsers FK
        int memberCount
        datetime createdAt
    }

    MEMBERSHIPS {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId communityId FK
        datetime joinedAt
    }

    POSTS {
        ObjectId _id PK
        string title
        string type "text|link|image"
        string body
        string mediaUrl
        string linkUrl
        object flair "label, color"
        ObjectId authorId FK
        ObjectId communityId FK
        int score
        int commentCount
        object aiSummary "text, bullets[], contentHash, source"
        object threadSummary "consensus, counterpoints[], tone"
        bool isEdited
        bool isDeleted
        bool isRemovedByMod
        string removalReason
        datetime createdAt
    }

    COMMENTS {
        ObjectId _id PK
        ObjectId postId FK
        ObjectId authorId FK
        ObjectId parentCommentId FK
        ObjectId[] ancestors "materialised path"
        int depth
        string body
        int score
        bool isEdited
        bool isDeleted
        bool isRemovedByMod
        datetime createdAt
    }

    VOTES {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId targetId "post or comment id"
        string targetType "post|comment"
        int value "+1 | -1"
        datetime updatedAt
    }

    CONVERSATIONS {
        ObjectId _id PK
        ObjectId[] participants FK
        bool isGroup
        string title
        object lastMessage "text, senderId, createdAt"
        string dmKey "sorted participant ids"
        object[] lastRead "userId, at"
        datetime updatedAt
    }

    MESSAGES {
        ObjectId _id PK
        ObjectId conversationId FK
        ObjectId senderId FK
        string content
        ObjectId[] readBy FK
        datetime createdAt
    }

    NOTIFICATIONS {
        ObjectId _id PK
        ObjectId recipientId FK
        ObjectId actorId FK
        string type
        string message
        string link
        bool isRead
        datetime createdAt
    }

    REPORTS {
        ObjectId _id PK
        ObjectId reporterId FK
        ObjectId targetId
        string targetType "post|comment"
        ObjectId communityId FK
        string reason
        string status "open|resolved|dismissed"
        datetime createdAt
    }
```

## Index reference

| Collection | Index | Why |
| --- | --- | --- |
| users | `{ username: 1 } unique` | Login/profile lookup, race-safe registration |
| users | `{ email: 1 } unique` | Login, race-safe registration |
| users | text `username, displayName` | Profile/mention search |
| communities | `{ name: 1 } unique` | Community URLs, race-safe creation |
| communities | text `name, description` | Community search |
| memberships | `{ userId: 1, communityId: 1 } unique` | One membership per user; concurrent joins |
| posts | `{ communityId: 1, createdAt: -1 }` | Community “New” feed |
| posts | `{ communityId: 1, score: -1 }` | Community “Top” feed |
| posts | `{ score: -1 }`, `{ createdAt: -1 }` | Global feeds |
| comments | `{ postId: 1, parentCommentId: 1, createdAt: 1 }` | Thread fetch/grouping |
| comments | `{ postId: 1, ancestors: 1 }` | Materialised-path subtree reads |
| votes | `{ userId: 1, targetId: 1, targetType: 1 } unique` | **Voting rule enforcement** |
| votes | `{ targetId: 1, targetType: 1, value: 1 }` | Score reconciliation / audits |
| conversations | `{ participants: 1, updatedAt: -1 }` | Chat inbox |
| conversations | `{ dmKey: 1 }` | Reuse existing 1-on-1 thread |
| messages | `{ conversationId: 1, createdAt: -1 }` | Paginated history |
| notifications | `{ recipientId: 1, isRead: 1, createdAt: -1 }` | Bell unread counts |
| reports | `{ communityId: 1, status: 1, createdAt: -1 }` | Moderator queue |
| reports | `{ reporterId: 1, targetId: 1, targetType: 1 } unique` | One report per user/target |

## Invariants

1. **Voting rule:** at most one `votes` document per `(userId, targetId, targetType)`.
2. **Score integrity:** `posts.score` / `comments.score` equals the sum of active vote values. Enforced by applying only exact deltas inside the same transaction as the vote write.
3. **Karma integrity:** author `postKarma` / `commentKarma` moves by the same delta in the same transaction.
4. **Membership count:** `communities.memberCount` changes by exactly ±1 with the corresponding membership document, inside a transaction.
5. **Comment count:** increments atomically with comment creation (`$inc` in the same transaction).
6. **Thread integrity:** comments are soft-deleted; parents remain as `[deleted]`/`[removed by moderator]` so replies keep their place.

## Transaction boundary

```
withTransaction(
  votes.insertOne | updateOne | deleteOne
  posts.findOneAndUpdate({ $inc: { score: delta } })
  users.updateOne({ $inc: { postKarma: delta } })
)
```

Retries: `WriteConflict` (112), `DuplicateKey` (11000), `TransientTransactionError`; 5 attempts with 15–50 ms jitter.
