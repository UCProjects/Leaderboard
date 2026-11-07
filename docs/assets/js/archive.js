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

function monthKey(timestamp) {
  return new Date(timestamp * 1000).toISOString().slice(0, 7);
}

function monthLabel(key) {
  const [year, month] = key.split('-');
  return `${months[Number(month) - 1]} ${year}`;
}

function groupByMonth(timestamps, packed) {
  const groups = new Map();
  const group = (key) => {
    if (!groups.has(key)) groups.set(key, { key, entries: [], packed: 0 });
    return groups.get(key);
  };
  timestamps.forEach((timestamp) => group(monthKey(timestamp)).entries.push(timestamp));
  Object.entries(packed).forEach(([key, count]) => {
    group(key).packed = count;
  });
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

const columns = ['Rank', 'LV', 'Player', 'Division', 'Elo', 'Wins', 'Losses'];

function span(attributes, text) {
  const el = document.createElement('span');
  Object.entries(attributes).forEach(([key, val]) => el.setAttribute(key, val));
  el.textContent = text;
  return el;
}

function packedTable([rank, rankChange, level, name, id, division, elo, eloChange, wins, winsChange, losses, lossesChange]) {
  return [
    span({ 'data-change': rankChange }, rank),
    level,
    span({ title: `ID: ${id}` }, name),
    division,
    span({ 'data-change': eloChange }, elo),
    span({ 'data-change': winsChange }, wins),
    span({ 'data-change': lossesChange }, losses),
  ];
}

function packedTableNode(rows) {
  const table = document.createElement('table');
  table.className = 'leaderboard';
  const head = table.createTHead().insertRow();
  columns.forEach((name) => {
    const th = document.createElement('th');
    th.textContent = name;
    head.append(th);
  });
  const body = table.createTBody();
  rows.forEach((row) => {
    const tr = body.insertRow();
    packedTable(row).forEach((content) => {
      const td = tr.insertCell();
      td.append(content);
    });
  });
  return table;
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

function packedEntryNode(timestamp, rows) {
  const entry = document.createElement('details');
  entry.className = 'archive-entry';
  const summary = document.createElement('summary');
  summary.textContent = formatTime(timestamp);
  const body = document.createElement('div');
  body.className = 'archive-body';
  entry.append(summary, body);
  entry.addEventListener('toggle', () => {
    if (entry.open && !entry.dataset.loaded) {
      entry.dataset.loaded = 'true';
      const table = packedTableNode(rows);
      body.append(table);
      extendTable(table);
    }
  });
  return entry;
}

async function fillMonth(month, template, packedUrl) {
  if (month.node.dataset.filled) return;
  month.node.dataset.filled = 'true';
  const list = month.node.querySelector('.archive-list');
  const items = month.entries.map((timestamp) => ({ timestamp, node: () => entryNode(template, timestamp) }));
  if (month.packed) {
    list.textContent = 'Loading...';
    try {
      const chunk = await fetchJson(`${packedUrl}/${month.key}.json`);
      Object.entries(chunk).forEach(([slug, rows]) => {
        items.push({ timestamp: Number(slug), node: () => packedEntryNode(Number(slug), rows) });
      });
    } catch (e) {
      list.textContent = 'This month could not be loaded.';
      month.node.dataset.filled = '';
      return;
    }
    list.textContent = '';
  }
  items.sort((a, b) => b.timestamp - a.timestamp);
  const fragment = document.createDocumentFragment();
  items.forEach((item) => fragment.append(item.node()));
  list.append(fragment);
}

async function start() {
  const root = document.getElementById('archive');
  if (!root) return;
  const template = root.dataset.url;
  const packedUrl = root.dataset.packed;
  const timestamps = JSON.parse(document.getElementById('archive-data').textContent).map(Number);
  const packed = packedUrl ? await fetchJson(`${packedUrl}/index.json`).catch(() => ({})) : {};
  const groups = groupByMonth(timestamps, packed);

  groups.forEach((month, index) => {
    const node = document.createElement('details');
    node.className = 'archive-month';
    const summary = document.createElement('summary');
    summary.textContent = `${monthLabel(month.key)} (${month.entries.length + month.packed})`;
    const list = document.createElement('div');
    list.className = 'archive-list';
    node.append(summary, list);
    month.node = node;
    node.addEventListener('toggle', () => {
      if (node.open) fillMonth(month, template, packedUrl);
    });
    root.append(node);
    if (index === 0) {
      node.open = true;
      fillMonth(month, template, packedUrl);
    }
  });
}

start();
