const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const {
  shardCount,
  shardOf,
  advanceSeason,
  tiersOf,
  createRecord,
  updateRecord,
  toRow,
  serialize,
} = require('../src/players.js');

const outDir = process.argv[2] || 'docs/assets/data/players';
const dataPath = /^docs\/assets\/data\/(hourly|daily|weekly)\/(\d+)\.json$/;

function listBlobs() {
  return new Promise((resolve, reject) => {
    const blobs = [];
    const child = spawn('git', ['rev-list', '--objects', '--all'], { stdio: ['ignore', 'pipe', 'inherit'] });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve(blobs) : reject(new Error(`git rev-list exited with ${code}`))));
    readline.createInterface({ input: child.stdout }).on('line', (line) => {
      const space = line.indexOf(' ');
      if (space < 0) return;
      const match = dataPath.exec(line.slice(space + 1));
      if (match) blobs.push({ sha: line.slice(0, space), type: match[1], timestamp: Number(match[2]) });
    });
  });
}

function createRecorder() {
  const players = new Map();
  let state;
  return {
    players,
    get state() {
      return state;
    },
    add({ timestamp }, rankings) {
      if (!rankings.length) return;
      state = advanceSeason(state, timestamp, rankings);
      const { season } = state;
      const tiers = tiersOf(rankings);
      rankings.forEach((entry, position) => {
        if (entry.id === undefined || entry.eloRanked === undefined) return;
        const rank = entry.rank || position + 1;
        let player = players.get(entry.id);
        if (!player) {
          player = { name: entry.username, last: 0, seasons: new Map(), names: new Map() };
          players.set(entry.id, player);
        }
        if (timestamp >= player.last) {
          player.last = timestamp;
          player.name = entry.username;
        }
        if (entry.username) player.names.set(entry.username, timestamp);
        const tier = tiers.get(entry.division);
        const record = player.seasons.get(season);
        if (record) {
          updateRecord(record, entry, rank, tier, timestamp);
        } else {
          player.seasons.set(season, createRecord(entry, rank, tier, timestamp));
        }
      });
    },
  };
}

function readBlobs(blobs, onBlob) {
  return new Promise((resolve, reject) => {
    const lookup = new Map(blobs.map((blob) => [blob.sha, blob]));
    const child = spawn('git', ['cat-file', '--batch'], { stdio: ['pipe', 'pipe', 'inherit'] });
    let pending = Buffer.alloc(0);
    let header;
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`git cat-file exited with ${code}`))));
    child.stdout.on('data', (chunk) => {
      pending = Buffer.concat([pending, chunk]);
      for (;;) {
        if (!header) {
          const end = pending.indexOf(10);
          if (end < 0) return;
          const [sha, type, size] = pending.subarray(0, end).toString().split(' ');
          if (type !== 'blob') throw new Error(`Unexpected object: ${sha} ${type}`);
          header = { sha, size: Number(size) };
          pending = pending.subarray(end + 1);
        }
        if (pending.length < header.size + 1) return;
        onBlob(lookup.get(header.sha), pending.subarray(0, header.size).toString());
        pending = pending.subarray(header.size + 1);
        header = undefined;
      }
    });
    child.stdin.end(`${blobs.map(({ sha }) => sha).join('\n')}\n`);
  });
}

function writeShards(players, state) {
  const latest = state.season;

  const history = Array.from({ length: shardCount }, () => ({}));
  const current = Array.from({ length: shardCount }, () => ({ season: latest, players: {} }));
  players.forEach((player, id) => {
    const rows = [...player.seasons]
      .filter(([season]) => season !== latest)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([season, record]) => toRow(season, record));
    const aliases = [...player.names]
      .filter(([name]) => name !== player.name)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
    if (rows.length || aliases.length) {
      history[shardOf(id)][id] = aliases.length ? { n: player.name, h: rows, a: aliases } : { n: player.name, h: rows };
    }
    const record = player.seasons.get(latest);
    if (record) current[shardOf(id)].players[id] = { n: player.name, c: serialize(record) };
  });

  fs.mkdirSync(path.join(outDir, 'current'), { recursive: true });
  history.forEach((shard, i) => fs.writeFileSync(path.join(outDir, `${i}.json`), JSON.stringify(shard)));
  current.forEach((shard, i) => fs.writeFileSync(path.join(outDir, 'current', `${i}.json`), JSON.stringify(shard)));
  fs.writeFileSync(path.join(outDir, 'current', 'meta.json'), JSON.stringify(state));
  return latest;
}

async function run() {
  const blobs = (await listBlobs()).sort((a, b) => a.timestamp - b.timestamp);
  const counts = blobs.reduce((ret, { type }) => (ret[type] = (ret[type] || 0) + 1, ret), {});
  console.log(`snapshots in history: ${JSON.stringify(counts)}`);

  const recorder = createRecorder();
  let done = 0;
  let skipped = 0;
  await readBlobs(blobs, (blob, text) => {
    try {
      recorder.add(blob, JSON.parse(text));
    } catch (e) {
      skipped += 1;
    }
    done += 1;
    if (done % 2000 === 0) console.log(`${done}/${blobs.length}`);
  });

  const latest = writeShards(recorder.players, recorder.state);
  const months = new Set();
  recorder.players.forEach(({ seasons }) => seasons.forEach((_, season) => months.add(season)));
  console.log(`snapshots read: ${done}, skipped: ${skipped}, players: ${recorder.players.size}, seasons: ${months.size}, current season: ${latest}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
