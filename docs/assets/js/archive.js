import { extendTable } from './table.js';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(value) {
  return `0${value}`.slice(-2);
}

function formatTime(timestamp) {
  const date = new Date(timestamp * 1000);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function groupByMonth(timestamps) {
  const groups = new Map();
  timestamps.forEach((timestamp) => {
    const date = new Date(timestamp * 1000);
    const key = date.getFullYear() * 12 + date.getMonth();
    if (!groups.has(key)) {
      groups.set(key, { label: `${months[date.getMonth()]} ${date.getFullYear()}`, entries: [] });
    }
    groups.get(key).entries.push(timestamp);
  });
  return [...groups.values()];
}

function urlOf(template, timestamp) {
  return template.replace('__SLUG__', timestamp);
}

async function loadTable(entry, url) {
  const body = entry.querySelector('.archive-body');
  body.textContent = 'Loading...';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const page = new DOMParser().parseFromString(await res.text(), 'text/html');
    const table = page.querySelector('.leaderboard');
    if (!table) throw new Error('No table found');
    body.textContent = '';
    body.append(document.importNode(table, true));
    const more = document.createElement('a');
    more.href = url;
    more.textContent = 'See more';
    body.append(more);
    extendTable(body.querySelector('.leaderboard'));
  } catch (e) {
    body.textContent = 'This update could not be loaded.';
  }
}

function entryNode(template, timestamp) {
  const url = urlOf(template, timestamp);
  const entry = document.createElement('details');
  entry.className = 'archive-entry';
  const summary = document.createElement('summary');
  const link = document.createElement('a');
  link.href = url;
  link.textContent = formatTime(timestamp);
  summary.append(link);
  const body = document.createElement('div');
  body.className = 'archive-body';
  entry.append(summary, body);
  entry.addEventListener('toggle', () => {
    if (entry.open && !entry.dataset.loaded) {
      entry.dataset.loaded = 'true';
      loadTable(entry, url);
    }
  });
  return entry;
}

function fillMonth(month, template) {
  if (month.node.dataset.filled) return;
  month.node.dataset.filled = 'true';
  const list = month.node.querySelector('.archive-list');
  const fragment = document.createDocumentFragment();
  month.entries.forEach((timestamp) => fragment.append(entryNode(template, timestamp)));
  list.append(fragment);
}

function start() {
  const root = document.getElementById('archive');
  if (!root) return;
  const template = root.dataset.url;
  const timestamps = JSON.parse(document.getElementById('archive-data').textContent)
    .map(Number)
    .sort((a, b) => b - a);
  const groups = groupByMonth(timestamps);

  groups.forEach((month, index) => {
    const node = document.createElement('details');
    node.className = 'archive-month';
    const summary = document.createElement('summary');
    summary.textContent = `${month.label} (${month.entries.length})`;
    const list = document.createElement('div');
    list.className = 'archive-list';
    node.append(summary, list);
    month.node = node;
    node.addEventListener('toggle', () => {
      if (node.open) fillMonth(month, template);
    });
    root.append(node);
    if (index === 0) {
      node.open = true;
      fillMonth(month, template);
    }
  });
}

start();
