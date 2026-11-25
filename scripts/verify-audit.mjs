#!/usr/bin/env node
/**
 * Verify the REA audit against the evidence committed with it.
 *
 * The audit document (docs/REA-AUDIT.md) states structural counts taken from
 * REA capture bundles in docs/rea-evidence/. Those numbers are hand-written, so
 * they can drift when either the document or a capture changes. This script
 * re-derives every table figure and the prose-only claims from the JSON and
 * fails if the document no longer matches its evidence.
 *
 * Usage: npm run audit:verify   (or: node scripts/verify-audit.mjs)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOC_PATH = path.join(ROOT, 'docs/REA-AUDIT.md');
const EVIDENCE_DIR = path.join(ROOT, 'docs/rea-evidence');

const failures = [];
let checks = 0;

function check(label, actual, expected) {
  checks += 1;
  if (actual !== expected) {
    failures.push(`${label}: document says ${JSON.stringify(expected)}, evidence says ${JSON.stringify(actual)}`);
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(EVIDENCE_DIR, file), 'utf8'));
}

function metricsFor(file) {
  const bundle = readJson(file);
  const normalized = bundle.normalized_result ?? bundle;
  const dom = normalized.dom?.nodes ?? [];
  const ax = normalized.accessibility?.nodes ?? [];
  const tags = {};
  for (const node of dom) {
    if (node.node_type === 1 && node.node_name) tags[node.node_name] = (tags[node.node_name] ?? 0) + 1;
  }
  const roles = {};
  for (const node of ax) {
    if (node.role) roles[node.role] = (roles[node.role] ?? 0) + 1;
  }
  return {
    dom: dom.length,
    ax: ax.length,
    article: roles.article ?? 0,
    heading: roles.heading ?? 0,
    button: roles.button ?? 0,
    link: roles.link ?? 0,
    banner: roles.banner ?? 0,
    main: roles.main ?? 0,
    navigation: roles.navigation ?? 0,
    complementary: roles.complementary ?? 0,
    list: roles.list ?? 0,
    listitem: roles.listitem ?? 0,
    details: tags.DETAILS ?? 0,
    summary: tags.SUMMARY ?? 0,
    combobox: roles.combobox ?? 0,
    consoleErrors: (normalized.console?.events ?? []).filter((event) => event.type === 'error').length,
  };
}

function parseNumber(cell) {
  // The document annotates some cells, e.g. "0 (`SHREDDIT-POST`)".
  const bare = cell.replace(/`[^`]*`/g, '');
  const match = bare.match(/\d[\d,]*/);
  return match ? Number(match[0].replace(/,/g, '')) : NaN;
}

const doc = fs.readFileSync(DOC_PATH, 'utf8');

// 1. The comparison table must exist and cover four capture columns.
const tableStart = doc.indexOf('| Signal | Reddit feed (archived)');
if (tableStart === -1) {
  failures.push('comparison table: could not find the "Community page and post detail" table header');
}
const tableEnd = doc.indexOf('\n\n', tableStart);
const tableLines = tableStart === -1 ? [] : doc.slice(tableStart, tableEnd).split('\n');
const headerCells = tableLines[0]?.split('|').map((cell) => cell.trim()).filter(Boolean) ?? [];

const columns = [
  { match: /^Reddit feed \(archived\)$/i, file: 'reddit-archive-inspect.json' },
  { match: /^Reddit post \(archived\)$/i, file: 'reddit-post-inspect.json' },
  { match: /^Reddit thread.*old\.reddit/i, file: 'reddit-old-inspect.json' },
  { match: /Threadit.*\/r\/webdev/i, file: 'threadit-community-inspect.json' },
  { match: /^Threadit post$/i, file: 'threadit-post-inspect.json' },
];

check('table column count', headerCells.length, 1 + columns.length);

// Bind each column to its capture by header text, so a reordered or renamed
// column fails instead of comparing the wrong evidence to the wrong cell.
const mappedColumns = headerCells.slice(1).map((label) => columns.find((column) => column.match.test(label)) ?? null);
check('every table column maps to a capture', mappedColumns.every(Boolean), true);
const activeColumns = mappedColumns.filter(Boolean);

const metrics = activeColumns.map(({ file }) => metricsFor(file));

const rows = {
  'DOM nodes': ['dom'],
  'Accessibility nodes': ['ax'],
  article: ['article'],
  heading: ['heading'],
  button: ['button'],
  link: ['link'],
  'banner / main / navigation': ['banner', 'main', 'navigation'],
  complementary: ['complementary'],
  'list / listitem': ['list', 'listitem'],
  'details / summary': ['details', 'summary'],
  combobox: ['combobox'],
  'Console errors': ['consoleErrors'],
};

for (const line of tableLines.slice(2)) {
  const cells = line.split('|').map((cell) => cell.trim()).filter(Boolean);
  if (!cells.length) continue;
  const key = cells[0].replace(/`/g, '');
  const keys = rows[key];
  if (!keys) {
    failures.push(`comparison table: unmapped row "${key}"`);
    continue;
  }
  const values = cells.slice(1);
  check(`row "${key}" column count`, values.length, activeColumns.length);
  values.forEach((cell, index) => {
    if (cell === 'excluded') return; // Reddit's console evidence is policy-filtered.
    const parts = cell.split('/').map((part) => part.trim());
    keys.forEach((metric, partIndex) => {
      check(`${activeColumns[index].file} ${metric}`, metrics[index][metric], parseNumber(parts[partIndex]));
    });
  });
}

// 2. Prose claims that the table cannot express.
const post = readJson('threadit-post-inspect.json').normalized_result;
const postNodes = post.accessibility.nodes;
const named = (name) => postNodes.filter((node) => node.name && node.name.trim() === name).length;

check('post: Collapse thread controls (documented 6)', named('Collapse thread'), 6);
check('post: Comment options controls (documented 6)', named('Comment options'), 6);
check('post: Reply controls (documented eighteen)', named('Reply'), 18);
check('post: "6 comments" heading', postNodes.some((node) => node.role === 'heading' && node.name === '6 comments'), true);
check('post: comment sort combobox', postNodes.some((node) => node.role === 'combobox'), true);
check(
  'post: sort options are Newest first / Top first',
  JSON.stringify(postNodes.filter((node) => node.role === 'option').map((node) => node.name)),
  JSON.stringify(['Newest first', 'Top first']),
);

const redditThread = readJson('reddit-old-inspect.json').normalized_result;
const threadText = redditThread.accessibility.nodes
  .filter((node) => node.role === 'StaticText')
  .map((node) => node.name)
  .filter(Boolean);
const threadLinks = (name) =>
  redditThread.accessibility.nodes.filter((node) => node.role === 'link' && node.name?.trim() === name).length;
check('Reddit thread: "all 18 comments"', threadText.includes('all 18 comments'), true);
check('Reddit thread: reply links (documented 18)', threadLinks('reply'), 18);
check('Reddit thread: permalink links (documented 18)', threadLinks('permalink'), 18);
check('Reddit thread: save links (documented 19)', threadLinks('save'), 19);
check('Reddit thread: report links (documented 19)', threadLinks('report'), 19);

const community = readJson('threadit-community-inspect.json').normalized_result;
const communityText = community.accessibility.nodes
  .filter((node) => node.role === 'StaticText')
  .map((node) => node.name)
  .filter(Boolean);
const rules = ['Be respectful', 'No low-effort posts', 'No self-promotion spam', 'Use descriptive titles'];
check('community: member count text node', communityText.includes('5'), true);
check('community: members label', communityText.includes(' members') || communityText.includes('Members'), true);
check('community: moderator alice_dev', communityText.some((text) => text.trim() === 'alice_dev'), true);
check('community: four rule titles', rules.every((rule) => communityText.includes(rule)), true);

// 3. Document integrity: sections, the comment-subtree limitation, no stale paths.
for (const heading of ['### Community header', '### Post page and comment thread']) {
  checks += 1;
  if (!doc.includes(heading)) failures.push(`document: missing section "${heading}"`);
}
for (const phrase of [
  'The archived Reddit thread has no comments.',
  'its comment subtree never populated',
  '6 `Collapse thread`',
  '6 `Comment options`',
  'eighteen `Reply`',
  '`6 comments`',
  '**all 18 comments**',
  'four numbered **Community rules**',
  'u/alice_dev',
]) {
  checks += 1;
  if (!doc.includes(phrase)) failures.push(`document: missing claim "${phrase}"`);
}
for (const stale of ['/Applications/Google', '.tools/rea/evidence']) {
  checks += 1;
  if (doc.includes(stale)) failures.push(`document: stale reference "${stale}"`);
}

// 4. Every capture the document names must exist, and PNGs must be real images.
const referenced = new Set(doc.match(/docs\/rea-evidence\/[A-Za-z0-9._-]+/g) ?? []);
check('document references at least one capture', referenced.size > 0, true);
for (const relative of referenced) {
  const absolute = path.join(ROOT, relative);
  checks += 1;
  if (!fs.existsSync(absolute)) {
    failures.push(`evidence: document references missing file "${relative}"`);
    continue;
  }
  if (relative.endsWith('.png')) {
    const signature = fs.readFileSync(absolute).subarray(0, 8).toString('hex');
    if (signature !== '89504e470d0a1a0a') failures.push(`evidence: "${relative}" is not a PNG`);
  }
  if (relative.endsWith('.json')) {
    try {
      readJson(path.basename(relative));
    } catch (error) {
      failures.push(`evidence: "${relative}" is not valid JSON (${error.message})`);
    }
  }
}

if (failures.length) {
  console.error(`REA audit verification FAILED — ${failures.length} of ${checks} checks`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(`REA audit verification passed — ${checks} checks against ${activeColumns.length} captures`);
