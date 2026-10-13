import { extra } from './formatter.js';

const shardCount = 128;

async function fetchJson(url) {
  const res = await fetch(url);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

function divisionName(text = '') {
  return text.replace('_', ' ');
}

function toRows(history = {}, current = { players: {} }, id) {
  const rows = (history[id] ? history[id].h : []).map(([season, rank, elo, wins, losses, level, top, bottom]) => ({
    season, rank, elo, wins, losses, level, top, bottom,
  }));
  const now = current.players[id];
  if (now) {
    const [rank, elo, wins, losses, level, top, , bottom] = now.c;
    rows.push({
      season: current.season, rank, elo, wins, losses, level, top, bottom, active: true,
    });
  }
  return rows.sort((a, b) => (a.season < b.season ? 1 : -1));
}

function render(name, rows) {
  document.getElementById('player-name').textContent = name;
  document.title = `${name} · ${document.title.split(' · ').slice(1).join(' · ') || 'Leaderboard'}`;

  const bestRank = rows.reduce((best, row) => (row.rank <= best.rank ? row : best));
  const peakElo = rows.reduce((best, row) => (row.elo >= best.elo ? row : best));
  document.getElementById('player-summary').textContent = [
    `${rows.length} ${rows.length === 1 ? 'season' : 'seasons'}`,
    `best rank ${bestRank.rank} (${bestRank.season})`,
    `peak elo ${peakElo.elo} (${peakElo.season})`,
  ].join(' · ');

  const table = document.querySelector('.player-history');
  const header = table.querySelector('thead tr');
  ['Season', 'Best Rank', 'Peak Elo', 'Wins', 'Losses', ...extra.map(({ name: label }) => label), 'LV', 'Best Division', 'Worst Division']
    .forEach((label) => {
      const th = document.createElement('th');
      th.textContent = label;
      header.append(th);
    });

  const body = table.querySelector('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    const games = row.wins + row.losses;
    [
      row.active ? `${row.season} (current)` : row.season,
      row.rank,
      row.elo,
      row.wins,
      row.losses,
      ...extra.map(({ format }) => (games ? format({ winsRanked: row.wins, lossesRanked: row.losses }) : '-')),
      row.level,
      divisionName(row.top),
      divisionName(row.bottom),
    ].forEach((value) => {
      const td = document.createElement('td');
      td.textContent = value;
      tr.append(td);
    });
    body.append(tr);
  });
  table.hidden = false;
}

async function load() {
  const message = document.getElementById('player-message');
  const id = Number(new URLSearchParams(window.location.search).get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    message.textContent = 'Select a player from the leaderboard to see their history.';
    return;
  }

  const shard = id % shardCount;
  const [history, current] = await Promise.all([
    fetchJson(`${playersURL}/${shard}.json`),
    fetchJson(`${playersURL}/current/${shard}.json`),
  ]);
  const rows = toRows(history, current, id);
  if (!rows.length) {
    message.textContent = 'No history found for this player.';
    return;
  }

  const name = (current && current.players[id] ? current.players[id].n : undefined) || history[id].n;
  render(name, rows);
}

load();
