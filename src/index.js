const fs = require('fs');
const login = require('./login.js');
const { updatePlayers } = require('./players.js');

const {
  access,
  readFile,
  writeFile,
  mkdir,
  readdir,
  rm,
} = fs.promises;

const from = 'https://undercards.net/Leaderboard?action=ranked';

const retentionDays = {
  hourly: 7,
  daily: 365,
  weekly: 0,
};

const safeReadData = ['id', 'username', 'winsRanked', 'lossesRanked', 'division', 'level', 'eloRanked'];

async function loadPrevious(rankingsPath) {
  try {
    await access(rankingsPath, fs.constants.F_OK | fs.constants.W_OK);
    return JSON.parse(await readFile(rankingsPath));
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw new Error('Not writable');
    }
    return [];
  }
}

async function prune(type) {
  const days = retentionDays[type];
  if (!days) return;
  const dir = `./docs/assets/data/${type}`;
  const cutoff = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
  const names = await readdir(dir).catch((e) => {
    if (e.code !== 'ENOENT') throw e;
    return [];
  });
  await Promise.all(names
    .filter((name) => parseInt(name, 10) < cutoff)
    .map((name) => rm(`${dir}/${name}`)));
}

async function loadChanges(type = 'daily', skipCommit = '') {
  const rankingsPath = `./data/rankings-${type}.json`;
  const { leaderboard } = await login(from);
  const rankings = JSON.parse(leaderboard)
    .map((data) => safeReadData.reduce((ret, key) => (ret[key] = data[key], ret), {}));
  const old = (await loadPrevious(rankingsPath))
    .reduce((ret, val, i) => (val.position = i, ret[val.id] = val, ret), {});

  rankings.forEach((data, position) => {
    const prev = old[data.id];
    if (prev) {
      data.eloChange = data.eloRanked - prev.eloRanked; // Higher elo is better
      data.rankChange = prev.position - position; // Lower position is better
      data.wins = data.winsRanked - prev.winsRanked;
      data.losses = data.lossesRanked - prev.lossesRanked;
    }
    data.rank = position + 1;
  });

  if (!skipCommit) {
    await Promise.all(rankings.map((data) => writeFile(`./data/users/${data.id}.json`, JSON.stringify(data, undefined, 2))));
    await writeFile(rankingsPath, JSON.stringify(rankings, undefined, 2));
  }

  const columns = [{
    key: 'rank',
    format: (text = '', { rankChange }) => change(text, rankChange),
  }, {
    key: 'level',
    name: 'LV',
  }, {
    key: 'username',
    name: 'Player',
    format: (text = '', { id }) => `<span title="ID: ${id}">${text}</span>`,
  }, {
    key: 'division',
    format: (text = '') => text.replace('_', ' '),
  }, {
    key: 'eloRanked',
    name: 'Elo',
    format: (text = '', { eloChange }) => change(text, eloChange),
  }, {
    key: 'winsRanked',
    name: 'Wins',
    format: (text = '', { wins }) => change(text, wins),
  }, {
    key: 'lossesRanked',
    name: 'Losses',
    format: (text = '', { losses }) => change(text, losses),
  }];

  const top5 = [
    `---`,
    `title: ${capitalize(type)} Update`,
    'layout: leaderboard',
    `category: ${type}`,
    `---`,
    '',
    '{: .leaderboard}',
    `| ${columns.map(({ name = '', key = '' }) => name || capitalize(key)).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    `${rankings.slice(0, 5).map((entry) => `| ${columns.map(({
      key = '',
      format = (text, entry) => text,
    }) => format(entry[key], entry)).join(' | ')} |`).join('\n')}`,
  ].join('\n');

  const slug = Math.floor(Date.now() / 1000);
  const postData = `./docs/assets/data/${type}`;
  const postPath = `./docs/_${type}`;
  await Promise.all([mkdir(postData, { recursive: true }), mkdir(postPath, { recursive: true })]);
  await Promise.all([
    writeFile(`${postData}/${slug}.json`, JSON.stringify(rankings)),
    writeFile(`${postPath}/${slug}.md`, top5),
  ]);

  if (!skipCommit) {
    await updatePlayers(rankings, slug);
    await prune(type);
  }
}

function capitalize(text = '') {
  return text[0].toUpperCase() + text.substring(1);
}

function change(text, data) {
  return `<span data-change="${data === undefined ? '-' : data}">${text}</span>`;
}

loadChanges(...process.argv.slice(2)).catch((e) => {
  console.error(e);
  process.exit(1);
});
