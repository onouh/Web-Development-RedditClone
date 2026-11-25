#!/usr/bin/env node
/**
 * Verify the REA audit against the evidence committed with it.
 *
 * docs/REA-AUDIT.md states structural counts taken from the REA capture bundles
 * in docs/rea-evidence/. Those numbers are hand-written, so they drift when
 * either the document or a capture changes. This script re-derives both
 * comparison tables and the prose claims from the JSON, and fails if the
 * document no longer matches its evidence.
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

function fail(message) {
  failures.push(message);
}

function check(label, actual, expected) {
  checks += 1;
  if (actual !== expected) {
    fail(`${label}: document says ${JSON.stringify(expected)}, evidence says ${JSON.stringify(actual)}`);
  }
}

/* ------------------------------------------------------------------ evidence */

const bundles = new Map();

/** Read one capture bundle (cached), unwrapping REA's envelope when present. */
function bundle(file) {
  if (!bundles.has(file)) {
    const parsed = JSON.parse(fs.readFileSync(path.join(EVIDENCE_DIR, file), 'utf8'));
    bundles.set(file, parsed.normalized_result ?? parsed);
  }
  return bundles.get(file);
}

/** Everything a table cell can quote from one capture. */
function metricsFor(file) {
  const data = bundle(file);
  const dom = data.dom?.nodes ?? [];
  const ax = data.accessibility?.nodes ?? [];
  const roles = {};
  const tags = {};
  for (const node of ax) if (node.role) roles[node.role] = (roles[node.role] ?? 0) + 1;
  for (const node of dom) {
    if (node.node_type === 1 && node.node_name) tags[node.node_name] = (tags[node.node_name] ?? 0) + 1;
  }
  return {
    title: ax.find((node) => node.role === 'RootWebArea')?.name ?? '',
    dom: dom.length,
    ax: ax.length,
    resources: (data.resources ?? []).length,
    consoleErrors: (data.console?.events ?? []).filter((event) => event.type === 'error').length,
    role: (name) => roles[name] ?? 0,
    tag: (name) => tags[name] ?? 0,
  };
}

/* -------------------------------------------------------------------- tables */

const METRICS = {
  title: (m) => m.title,
  dom: (m) => m.dom,
  ax: (m) => m.ax,
  resources: (m) => m.resources,
  banner: (m) => m.role('banner'),
  main: (m) => m.role('main'),
  navigation: (m) => m.role('navigation'),
  complementary: (m) => m.role('complementary'),
  article: (m) => m.role('article'),
  button: (m) => m.role('button'),
  link: (m) => m.role('link'),
  heading: (m) => m.role('heading'),
  list: (m) => m.role('list'),
  listitem: (m) => m.role('listitem'),
  form: (m) => m.role('form'),
  searchbox: (m) => m.role('searchbox'),
  image: (m) => m.role('image'),
  combobox: (m) => m.role('combobox'),
  details: (m) => m.tag('DETAILS'),
  summary: (m) => m.tag('SUMMARY'),
  consoleErrors: (m) => m.consoleErrors,
};

// Row label (lower-cased, backticks and parenthetical asides removed) -> metrics
// in cell order. "list / listitem" is one cell holding two slash-separated counts.
const ROWS = {
  title: ['title'],
  'dom nodes': ['dom'],
  'accessibility nodes': ['ax'],
  resources: ['resources'],
  banner: ['banner'],
  main: ['main'],
  navigation: ['navigation'],
  complementary: ['complementary'],
  article: ['article'],
  'banner / main / navigation': ['banner', 'main', 'navigation'],
  button: ['button'],
  link: ['link'],
  heading: ['heading'],
  'list / listitem': ['list', 'listitem'],
  'details / summary': ['details', 'summary'],
  form: ['form'],
  searchbox: ['searchbox'],
  image: ['image'],
  combobox: ['combobox'],
  'console errors': ['consoleErrors'],
};

// Column header -> capture, matched exactly after normalization so a renamed or
// reordered column fails loudly instead of comparing the wrong evidence.
const COLUMNS = {
  'reddit r/webdev (archived)': 'reddit-archive-inspect.json',
  'reddit feed (archived)': 'reddit-archive-inspect.json',
  'reddit post (archived)': 'reddit-post-inspect.json',
  'reddit thread (archived, old.reddit)': 'reddit-old-inspect.json',
  'threadit /popular': 'threadit-postfix-inspect.json',
  'threadit /r/webdev': 'threadit-community-inspect.json',
  'threadit post': 'threadit-post-inspect.json',
};

const stripTicks = (text) => text.replace(/`/g, '');
const rowKey = (label) =>
  stripTicks(label)
    .replace(/\s*\([^)]*\)/g, '')
    .trim()
    .toLowerCase();
const columnKey = (label) => stripTicks(label).trim().toLowerCase();

function cells(line) {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

/** The document's Markdown tables, found by their "| Signal |" header row. */
function comparisonTables(markdown) {
  const lines = markdown.split('\n');
  const tables = [];
  for (let start = 0; start < lines.length; start += 1) {
    if (!lines[start].startsWith('| Signal |')) continue;
    let end = start;
    while (end < lines.length && lines[end].startsWith('|')) end += 1;
    const block = lines.slice(start, end);
    tables.push({
      line: start + 1,
      columns: cells(block[0]).slice(1),
      // block[1] is the | --- | separator; the rest are data rows.
      rows: block.slice(2).map(cells),
    });
    start = end;
  }
  return tables;
}

function parseNumber(cell) {
  // Some cells carry an annotation, e.g. "0 (`SHREDDIT-POST`)".
  const match = stripTicks(cell).match(/\d[\d,]*/);
  return match ? Number(match[0].replace(/,/g, '')) : NaN;
}

const doc = fs.readFileSync(DOC_PATH, 'utf8');

const tables = comparisonTables(doc);
check('comparison tables found', tables.length, 2);

for (const table of tables) {
  const where = `table at line ${table.line}`;
  const files = table.columns.map((label) => {
    const file = COLUMNS[columnKey(label)];
    if (!file) fail(`${where}: unmapped column "${label}" — add it to COLUMNS`);
    return file;
  });
  if (files.some((file) => !file)) continue;

  checks += 1;
  if (!table.rows.every((row) => row.length === table.columns.length + 1)) {
    fail(`${where}: a row does not have ${table.columns.length + 1} cells`);
  }

  const metrics = files.map(metricsFor);
  for (const [label, ...values] of table.rows) {
    const key = rowKey(label);
    const keys = ROWS[key];
    if (!keys) {
      checks += 1;
      fail(`${where}: unmapped row "${label}" — add it to ROWS`);
      continue;
    }
    values.forEach((cell, index) => {
      if (cell === 'excluded') return; // REA's origin policy suppressed that capture's console.
      const parts = cell.split('/').map((part) => part.trim());
      keys.forEach((metric, partIndex) => {
        const actual = METRICS[metric](metrics[index]);
        const raw = stripTicks(parts[partIndex] ?? '');
        check(`${files[index]} ${metric}`, actual, typeof actual === 'number' ? parseNumber(raw) : raw);
      });
    });
  }
}

/* ------------------------------------------------------- prose-only claims */

const names = (nodes, name) => nodes.filter((node) => node.name?.trim() === name).length;
const staticText = (nodes) =>
  nodes
    .filter((node) => node.role === 'StaticText')
    .map((node) => node.name)
    .filter(Boolean);

const postAx = bundle('threadit-post-inspect.json').accessibility.nodes;
check('Threadit post: 6 Collapse thread controls', names(postAx, 'Collapse thread'), 6);
check('Threadit post: 6 Comment options controls', names(postAx, 'Comment options'), 6);
check('Threadit post: 18 Reply controls', names(postAx, 'Reply'), 18);
check(
  'Threadit post: "6 comments" heading',
  postAx.some((node) => node.role === 'heading' && node.name === '6 comments'),
  true,
);
check(
  'Threadit post: comment sort options',
  postAx
    .filter((node) => node.role === 'option')
    .map((node) => node.name)
    .join(', '),
  'Newest first, Top first',
);

const oldAx = bundle('reddit-old-inspect.json').accessibility.nodes;
const oldText = staticText(oldAx);
const oldLinks = (name) => oldAx.filter((node) => node.role === 'link' && node.name?.trim() === name).length;
check('Reddit thread: "all 18 comments"', oldText.includes('all 18 comments'), true);
check('Reddit thread: 18 reply links', oldLinks('reply'), 18);
check('Reddit thread: 18 permalink links', oldLinks('permalink'), 18);
check('Reddit thread: 19 save links (18 comments + post)', oldLinks('save'), 19);
check('Reddit thread: 19 report links (18 comments + post)', oldLinks('report'), 19);

const communityText = staticText(bundle('threadit-community-inspect.json').accessibility.nodes);
const headerAt = communityText.indexOf('Web Development');
check(
  'Threadit community: header reads "Web Development · 5 members"',
  headerAt === -1 ? null : communityText.slice(headerAt, headerAt + 4).join(''),
  'Web Development · 5 members',
);
const rules = ['Be respectful', 'No low-effort posts', 'No self-promotion spam', 'Use descriptive titles'];
check('Threadit community: four rule titles', rules.filter((rule) => communityText.includes(rule)).length, 4);
check(
  'Threadit community: moderator alice_dev',
  communityText.some((text) => text.trim() === 'alice_dev'),
  true,
);

// The pre-fix bundle is kept only to evidence the landmark fix.
const before = metricsFor('threadit-inspect.json');
check('pre-fix capture: no main role', before.role('main'), 0);
check('pre-fix capture: no MAIN element', before.tag('MAIN'), 0);
check('post-fix capture: one MAIN element', metricsFor('threadit-postfix-inspect.json').tag('MAIN'), 1);

/* ---------------------------------------------------- document integrity */

function expectDocContains(phrase) {
  checks += 1;
  if (!doc.includes(phrase)) fail(`document: missing claim "${phrase}"`);
}

for (const heading of ['### Community header', '### Post page and comment thread'])
  expectDocContains(heading);
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
  expectDocContains(phrase);
}
for (const stale of ['/Applications/Google', '.tools/rea/evidence']) {
  checks += 1;
  if (doc.includes(stale)) fail(`document: stale reference "${stale}"`);
}

/* ------------------------------------------------------------ evidence files */

// Every capture the document names must exist and parse, and every committed
// capture must be named: an unreferenced bundle is one to delete, not to trust.
const referenced = new Set(doc.match(/docs\/rea-evidence\/[A-Za-z0-9._-]+/g) ?? []);
check('document references evidence', referenced.size > 0, true);

for (const relative of referenced) {
  const absolute = path.join(ROOT, relative);
  checks += 1;
  if (!fs.existsSync(absolute)) {
    fail(`evidence: document references missing file "${relative}"`);
    continue;
  }
  if (relative.endsWith('.png')) {
    const signature = fs.readFileSync(absolute).subarray(0, 8).toString('hex');
    if (signature !== '89504e470d0a1a0a') fail(`evidence: "${relative}" is not a PNG`);
  } else if (relative.endsWith('.json')) {
    try {
      bundle(path.basename(relative));
    } catch (error) {
      fail(`evidence: "${relative}" is not a valid capture bundle (${error.message})`);
    }
  }
}

const committed = fs.readdirSync(EVIDENCE_DIR).filter((name) => /\.(json|png)$/.test(name));
for (const name of committed) {
  checks += 1;
  if (!referenced.has(`docs/rea-evidence/${name}`))
    fail(`evidence: committed file "${name}" is not referenced by the audit`);
}

/* ------------------------------------------------------------------------- */

if (failures.length) {
  console.error(`REA audit verification FAILED — ${failures.length} of ${checks} checks`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

const captures = new Set(tables.flatMap((table) => table.columns.map(columnKey)).map((key) => COLUMNS[key]));
console.log(`REA audit verification passed — ${checks} checks against ${captures.size} captures`);
