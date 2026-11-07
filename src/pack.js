const fs = require('fs');
const retention = require('./retention.js');

const {
  readdir,
  readFile,
  writeFile,
  mkdir,
  rm,
} = fs.promises;

const sourceDir = './docs/_hourly';
const archiveDir = './docs/assets/data/hourly-archive';
const batchSize = 500;

const header = [
  '---',
  'title: Hourly Update',
  'layout: leaderboard',
  'category: hourly',
  '---',
  '',
  '{: .leaderboard}',
  '| Rank | LV | Player | Division | Elo | Wins | Losses |',
  '| --- | --- | --- | --- | --- | --- | --- |',
];

const rowPattern = /^\| <span data-change="([^"]*)">([^<]*)<\/span> \| (.*?) \| <span title="ID: (\d+)">(.*)<\/span> \| (.*?) \| <span data-change="([^"]*)">([^<]*)<\/span> \| <span data-change="([^"]*)">([^<]*)<\/span> \| <span data-change="([^"]*)">([^<]*)<\/span> \|$/;

function value(text) {
  return text !== '' && `${Number(text)}` === text ? Number(text) : text;
}

function rowText([rank, rankChange, level, name, id, division, elo, eloChange, wins, winsChange, losses, lossesChange]) {
  return `| <span data-change="${rankChange}">${rank}</span> | ${level} | <span title="ID: ${id}">${name}</span> | ${division} | <span data-change="${eloChange}">${elo}</span> | <span data-change="${winsChange}">${wins}</span> | <span data-change="${lossesChange}">${losses}</span> |`;
}

function parseRow(line) {
  const match = rowPattern.exec(line);
  if (!match) return undefined;
  const [, rankChange, rank, level, id, name, division, eloChange, elo, winsChange, wins, lossesChange, losses] = match;
  const row = [rank, rankChange, level, name, id, division, elo, eloChange, wins, winsChange, losses, lossesChange].map(value);
  return rowText(row) === line ? row : undefined;
}

function parsePage(text) {
  const lines = text.split('\n');
  const rows = lines.slice(header.length).map(parseRow);
  const valid = header.every((line, i) => lines[i] === line)
    && rows.length > 0
    && rows.every(Boolean);
  return valid ? rows : undefined;
}

function monthOf(slug) {
  return new Date(Number(slug) * 1000).toISOString().slice(0, 7);
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    return fallback;
  }
}

function serialize(chunk) {
  const lines = Object.entries(chunk).map(([slug, rows]) => `${JSON.stringify(slug)}:${JSON.stringify(rows)}`);
  return `{\n${lines.join(',\n')}\n}\n`;
}

async function loadPages(names) {
  const pages = [];
  for (let i = 0; i < names.length; i += batchSize) {
    const batch = names.slice(i, i + batchSize);
    const texts = await Promise.all(batch.map((name) => readFile(`${sourceDir}/${name}`, 'utf8')));
    batch.forEach((name, j) => {
      const rows = parsePage(texts[j]);
      if (rows) pages.push({ name, slug: name.slice(0, -3), rows });
    });
  }
  return pages;
}

async function packHourly(days = retention.hourly) {
  const cutoff = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
  const all = await readdir(sourceDir).catch((e) => {
    if (e.code !== 'ENOENT') throw e;
    return [];
  });
  const names = all.filter((name) => /^\d+\.md$/.test(name) && parseInt(name, 10) < cutoff);
  if (!names.length) return { packed: 0, skipped: 0 };

  const pages = await loadPages(names);
  const months = new Map();
  pages.forEach((page) => {
    const key = monthOf(page.slug);
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(page);
  });

  await mkdir(archiveDir, { recursive: true });
  const index = await readJson(`${archiveDir}/index.json`, {});
  for (const [key, entries] of months) {
    const path = `${archiveDir}/${key}.json`;
    const chunk = await readJson(path, {});
    entries.forEach(({ slug, rows }) => {
      chunk[slug] = rows;
    });
    await writeFile(path, serialize(chunk));
    index[key] = Object.keys(chunk).length;
  }
  const sorted = Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(`${archiveDir}/index.json`, `${JSON.stringify(sorted)}\n`);

  await Promise.all(pages.map(({ name }) => rm(`${sourceDir}/${name}`)));
  return { packed: pages.length, skipped: names.length - pages.length };
}

module.exports = { packHourly };

if (require.main === module) {
  packHourly(process.argv[2] === undefined ? undefined : Number(process.argv[2])).then((result) => {
    console.log(`Packed ${result.packed} hourly pages, left ${result.skipped} as pages`);
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
