/**
 * Renders docs/database-schema.svg from the collection definitions below.
 * No external dependencies: keeps Deliverable 2 reproducible without Graphviz.
 *   npm run schema:svg
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const COLORS = {
  bg: '#F6F7F8',
  card: '#FFFFFF',
  border: '#E2E7E9',
  header: '#FF4500',
  ink: '#0F1A1C',
  muted: '#5C6C74',
  pk: '#FFB000',
  uk: '#46D160',
  fk: '#7193FF',
};

const columns = [
  [
    {
      name: 'users',
      rows: [
        ['_id', 'PK'],
        ['username', 'UK'],
        ['email', 'UK'],
        ['passwordHash', ''],
        ['displayName', ''],
        ['bio', ''],
        ['avatarUrl / bannerUrl', ''],
        ['postKarma / commentKarma', ''],
        ['savedPosts[]', 'FK', 'posts'],
        ['createdAt', ''],
      ],
    },
    {
      name: 'communities',
      rows: [
        ['_id', 'PK'],
        ['name', 'UK'],
        ['title / description', ''],
        ['iconUrl / bannerUrl', ''],
        ['creatorId', 'FK', 'users'],
        ['moderators[]', 'FK', 'users'],
        ['rules[] / flairs[]', ''],
        ['bannedUsers[]', 'FK', 'users'],
        ['memberCount', ''],
        ['createdAt', ''],
      ],
    },
    {
      name: 'memberships',
      rows: [
        ['_id', 'PK'],
        ['userId', 'FK', 'users'],
        ['communityId', 'FK', 'communities'],
        ['joinedAt', ''],
      ],
    },
  ],
  [
    {
      name: 'posts',
      rows: [
        ['_id', 'PK'],
        ['title / type', ''],
        ['body / mediaUrl / linkUrl', ''],
        ['flair', ''],
        ['authorId', 'FK', 'users'],
        ['communityId', 'FK', 'communities'],
        ['score', ''],
        ['commentCount', ''],
        ['aiSummary', ''],
        ['threadSummary', ''],
        ['isDeleted / isRemovedByMod', ''],
        ['createdAt', ''],
      ],
    },
    {
      name: 'comments',
      rows: [
        ['_id', 'PK'],
        ['postId', 'FK', 'posts'],
        ['authorId', 'FK', 'users'],
        ['parentCommentId', 'FK', 'comments'],
        ['ancestors[]', ''],
        ['depth', ''],
        ['body / score', ''],
        ['isDeleted / isRemovedByMod', ''],
        ['createdAt', ''],
      ],
    },
    {
      name: 'votes',
      rows: [
        ['_id', 'PK'],
        ['userId', 'FK', 'users'],
        ['targetId', 'FK', 'posts / comments'],
        ['targetType', ''],
        ['value  +1 | -1', ''],
        ['updatedAt', ''],
      ],
    },
  ],
  [
    {
      name: 'conversations',
      rows: [
        ['_id', 'PK'],
        ['participants[]', 'FK', 'users'],
        ['isGroup / title', ''],
        ['dmKey', 'UK'],
        ['lastMessage', ''],
        ['lastRead[]', ''],
        ['updatedAt', ''],
      ],
    },
    {
      name: 'messages',
      rows: [
        ['_id', 'PK'],
        ['conversationId', 'FK', 'conversations'],
        ['senderId', 'FK', 'users'],
        ['content', ''],
        ['readBy[]', 'FK', 'users'],
        ['createdAt', ''],
      ],
    },
    {
      name: 'notifications',
      rows: [
        ['_id', 'PK'],
        ['recipientId', 'FK', 'users'],
        ['actorId', 'FK', 'users'],
        ['type', ''],
        ['message / link', ''],
        ['isRead', ''],
        ['createdAt', ''],
      ],
    },
    {
      name: 'reports',
      rows: [
        ['_id', 'PK'],
        ['reporterId', 'FK', 'users'],
        ['targetId', 'FK', 'posts / comments'],
        ['targetType', ''],
        ['communityId', 'FK', 'communities'],
        ['reason / status', ''],
        ['createdAt', ''],
      ],
    },
  ],
];

const WIDTH = 1360;
const HEIGHT = 1140;
const CARD_W = 400;
const HEADER_H = 34;
const ROW_H = 20;
const PAD = 14;
const COL_X = [40, 480, 920];
const START_Y = 104;
const GAP = 26;

const escape = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const badgeColor = (badge) => COLORS[badge.toLowerCase()] || COLORS.muted;

let body = '';

columns.forEach((tables, columnIndex) => {
  let y = START_Y;
  for (const table of tables) {
    const height = HEADER_H + table.rows.length * ROW_H + PAD;
    const x = COL_X[columnIndex];

    body += `<g>
  <rect x="${x}" y="${y}" width="${CARD_W}" height="${height}" rx="10" fill="${COLORS.card}" stroke="${COLORS.border}" />
  <path d="M ${x} ${y + HEADER_H} L ${x} ${y + 10} Q ${x} ${y} ${x + 10} ${y} L ${x + CARD_W - 10} ${y} Q ${x + CARD_W} ${y} ${x + CARD_W} ${y + 10} L ${x + CARD_W} ${y + HEADER_H} Z" fill="${COLORS.header}" />
  <text x="${x + PAD}" y="${y + 22}" font-size="14" font-weight="700" fill="#FFFFFF">${escape(table.name)}</text>
  <text x="${x + CARD_W - PAD}" y="${y + 22}" font-size="10" text-anchor="end" fill="#FFFFFF" opacity="0.85">collection</text>
`;

    table.rows.forEach(([field, badge, reference], index) => {
      const rowY = y + HEADER_H + (index + 1) * ROW_H - 5;
      body += `  <text x="${x + PAD}" y="${rowY}" font-size="11.5" fill="${COLORS.ink}">${escape(field)}</text>\n`;
      if (reference) {
        body += `  <text x="${x + CARD_W - PAD}" y="${rowY}" font-size="10" text-anchor="end" fill="${COLORS.muted}">→ ${escape(reference)}</text>\n`;
      }
      if (badge) {
        const bx = x + CARD_W - PAD - (reference ? 96 : 0) - 24;
        body += `  <rect x="${bx}" y="${rowY - 10}" width="22" height="13" rx="4" fill="${badgeColor(badge)}" opacity="0.18" />\n`;
        body += `  <text x="${bx + 11}" y="${rowY}" font-size="8.5" font-weight="700" text-anchor="middle" fill="${badgeColor(badge)}">${escape(badge)}</text>\n`;
      }
    });

    if (table.name === 'votes') {
      body += `  <text x="${x + PAD}" y="${y + height - 8}" font-size="9.5" fill="${COLORS.header}">unique index (userId, targetId, targetType)</text>\n`;
    }
    if (table.name === 'memberships') {
      body += `  <text x="${x + PAD}" y="${y + height - 8}" font-size="9.5" fill="${COLORS.header}">unique index (userId, communityId)</text>\n`;
    }

    body += '</g>\n';
    y += height + GAP;
  }
});

const relationships = [
  'users 1 ── N posts.authorId',
  'users 1 ── N comments.authorId',
  'users 1 ── N votes.userId (unique per target)',
  'users 1 ── N memberships · communities 1 ── N memberships',
  'communities 1 ── N posts.communityId',
  'posts 1 ── N comments.postId',
  'comments 1 ── N comments.parentCommentId',
  'posts / comments 1 ── N votes (polymorphic targetId)',
  'conversations 1 ── N messages.conversationId',
  'communities 1 ── N reports · reports unique per reporter+target',
];

const footer = relationships
  .map((line, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 48 + column * 660;
    const y = 996 + row * 22;
    return `<text x="${x}" y="${y}" font-size="12" fill="${COLORS.muted}">• ${escape(line)}</text>`;
  })
  .join('\n');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="IBM Plex Sans, Helvetica, Arial, sans-serif">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.bg}" />
  <text x="40" y="52" font-size="24" font-weight="700" fill="${COLORS.ink}">Threadit — MongoDB document schema</text>
  <text x="40" y="74" font-size="12" fill="${COLORS.muted}">Fall 2026 Web Development project · 10 collections · votes are stored separately to enforce one active vote per user per target</text>
  <g transform="translate(1000, 30)">
    <rect x="0" y="0" width="26" height="14" rx="4" fill="${COLORS.pk}" opacity="0.18" />
    <text x="13" y="11" font-size="9" font-weight="700" text-anchor="middle" fill="${COLORS.pk}">PK</text>
    <text x="34" y="11" font-size="11" fill="${COLORS.muted}">primary key</text>
    <rect x="120" y="0" width="26" height="14" rx="4" fill="${COLORS.uk}" opacity="0.18" />
    <text x="133" y="11" font-size="9" font-weight="700" text-anchor="middle" fill="${COLORS.uk}">UK</text>
    <text x="154" y="11" font-size="11" fill="${COLORS.muted}">unique</text>
    <rect x="220" y="0" width="26" height="14" rx="4" fill="${COLORS.fk}" opacity="0.18" />
    <text x="233" y="11" font-size="9" font-weight="700" text-anchor="middle" fill="${COLORS.fk}">FK</text>
    <text x="254" y="11" font-size="11" fill="${COLORS.muted}">reference</text>
  </g>
  <line x1="40" y1="968" x2="1320" y2="968" stroke="${COLORS.border}" />
  <text x="40" y="984" font-size="12" font-weight="700" fill="${COLORS.ink}">Relationships &amp; constraints</text>
  ${footer}
</svg>
`;

const output = path.resolve(here, '../docs/database-schema.svg');
fs.writeFileSync(output, svg);
console.log('Wrote', output);
