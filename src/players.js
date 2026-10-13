const fs = require('fs');

const { readFile, writeFile, mkdir } = fs.promises;

const shardCount = 128;
const sameTierRange = 10;
const resetDrop = 0.5;
const resetMinimumWins = 2000;
const playersDir = 'docs/assets/data/players';

function shardOf(id) {
  return id % shardCount;
}

function monthLabel(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function nearestMonthLabel(timestamp) {
  const date = new Date(timestamp * 1000);
  const thisFirst = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const nextFirst = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  const nearest = date.getTime() - thisFirst <= nextFirst - date.getTime() ? thisFirst : nextFirst;
  return monthLabel(new Date(nearest));
}

function advanceSeason(state, timestamp, rankings) {
  const wins = rankings.reduce((sum, { winsRanked }) => sum + (winsRanked || 0), 0);
  if (!state) return { season: monthLabel(new Date(timestamp * 1000)), at: timestamp, wins };
  const reset = state.wins > resetMinimumWins && wins < state.wins * resetDrop;
  return { season: reset ? nearestMonthLabel(timestamp) : state.season, at: timestamp, wins };
}

function tiersOf(rankings) {
  const elos = new Map();
  rankings.forEach(({ division, eloRanked }) => {
    if (!division || eloRanked === undefined) return;
    if (!elos.has(division)) elos.set(division, []);
    elos.get(division).push(eloRanked);
  });
  const tiers = new Map();
  elos.forEach((values, division) => {
    values.sort((a, b) => a - b);
    tiers.set(division, values[Math.floor(values.length / 2)]);
  });
  return tiers;
}

function consider(current, division, tier, timestamp, direction) {
  if (current.tier == null) {
    Object.assign(current, { division, tier, at: timestamp });
    return;
  }
  const difference = (tier - current.tier) * direction;
  if (difference > sameTierRange) {
    Object.assign(current, { division, tier, at: timestamp });
  } else if (difference >= -sameTierRange && timestamp > current.at) {
    Object.assign(current, { division, at: timestamp });
  }
}

function createRecord(entry, rank, tier, timestamp) {
  return {
    rank,
    elo: entry.eloRanked,
    wins: entry.winsRanked || 0,
    losses: entry.lossesRanked || 0,
    level: entry.level || 0,
    top: { division: entry.division, tier, at: timestamp },
    bottom: { division: entry.division, tier, at: timestamp },
  };
}

function updateRecord(record, entry, rank, tier, timestamp) {
  record.rank = Math.min(record.rank, rank);
  record.elo = Math.max(record.elo, entry.eloRanked);
  record.wins = Math.max(record.wins, entry.winsRanked || 0);
  record.losses = Math.max(record.losses, entry.lossesRanked || 0);
  record.level = Math.max(record.level, entry.level || 0);
  if (tier === undefined) return;
  consider(record.top, entry.division, tier, timestamp, 1);
  consider(record.bottom, entry.division, tier, timestamp, -1);
}

function toRow(season, record) {
  return [season, record.rank, record.elo, record.wins, record.losses, record.level, record.top.division, record.bottom.division];
}

function serialize(record) {
  return [
    record.rank,
    record.elo,
    record.wins,
    record.losses,
    record.level,
    record.top.division,
    record.top.tier,
    record.bottom.division,
    record.bottom.tier,
  ];
}

function deserialize(values) {
  return {
    rank: values[0],
    elo: values[1],
    wins: values[2],
    losses: values[3],
    level: values[4],
    top: { division: values[5], tier: values[6], at: 0 },
    bottom: { division: values[7], tier: values[8], at: 0 },
  };
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    return fallback;
  }
}

function foldSeason(history, current) {
  Object.entries(current.players).forEach(([id, { n, c }]) => {
    const player = history[id] || (history[id] = { n, h: [] });
    player.n = n;
    if (player.h.some(([season]) => season === current.season)) return;
    player.h.push(toRow(current.season, deserialize(c)));
  });
}

async function updatePlayers(rankings, timestamp, dir = playersDir) {
  if (!rankings.length) return;
  await mkdir(`${dir}/current`, { recursive: true });
  const metaFile = `${dir}/current/meta.json`;
  const previous = await readJson(metaFile, undefined);
  if (previous && timestamp < previous.at) return;
  const state = advanceSeason(previous, timestamp, rankings);
  const { season } = state;
  const tiers = tiersOf(rankings);
  const grouped = Array.from({ length: shardCount }, () => []);
  rankings.forEach((entry, position) => {
    if (entry.id === undefined || entry.eloRanked === undefined) return;
    grouped[shardOf(entry.id)].push({ entry, rank: entry.rank || position + 1 });
  });

  await Promise.all(grouped.map(async (items, shard) => {
    const currentFile = `${dir}/current/${shard}.json`;
    let current = await readJson(currentFile, { season, players: {} });
    if (current.season > season) return;
    if (current.season < season) {
      const historyFile = `${dir}/${shard}.json`;
      const history = await readJson(historyFile, {});
      foldSeason(history, current);
      await writeFile(historyFile, JSON.stringify(history));
      current = { season, players: {} };
    }
    items.forEach(({ entry, rank }) => {
      const tier = tiers.get(entry.division);
      const existing = current.players[entry.id];
      if (!existing) {
        current.players[entry.id] = { n: entry.username, c: serialize(createRecord(entry, rank, tier, timestamp)) };
        return;
      }
      const record = deserialize(existing.c);
      updateRecord(record, entry, rank, tier, timestamp);
      existing.n = entry.username;
      existing.c = serialize(record);
    });
    await writeFile(currentFile, JSON.stringify(current));
  }));
  await writeFile(metaFile, JSON.stringify(state));
}

module.exports = {
  shardCount,
  shardOf,
  advanceSeason,
  tiersOf,
  createRecord,
  updateRecord,
  toRow,
  serialize,
  updatePlayers,
};
