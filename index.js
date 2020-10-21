const fs = require('fs');
const needle = require('needle');

const {
  access,
  readFile,
  writeFile,
  mkdir,
} = fs.promises;

const commit = true;

const from = 'https://undercards.net/Leaderboard?action=ranked';

const safeReadData = ['id', 'username', 'winsRanked', 'lossesRanked', 'division', 'level', 'eloRanked'];

function loadChanges(type = 'daily') {
  const rankingsPath = `./data/rankings-${type}.json`;
  return needle(from)
    // Parse the leaderboard
    .then((res) => JSON.parse(res.body.leaderboard))
    // Trim excess data
    .then((rankings = []) => rankings.map((data) => safeReadData.reduce((ret, key) => (ret[key] = data[key], ret), {})))
    // Load old rankings
    .then((rankings = []) => access(rankingsPath, fs.constants.F_OK | fs.constants.W_OK)
      // Parse old rankings
      .then(() => readFile(rankingsPath).then(JSON.parse))
      .catch((e) => {
        if (e.code !== 'ENOENT') {
          throw new Error('Not writable'); // Shouldn't ever happen, really.
        }
      })
      // Convert to lookup-by-id
      .then((old = []) => old.reduce((ret, val, i) => (val.position = i, ret[val.id] = val, ret), {}))
      .then((old = {}) => {
        rankings.forEach((data, position) => {
          // Calculate rank change and elo change
          const prev = old[data.id];
          if (prev) {
            data.eloChange = data.eloRanked - prev.eloRanked; // Higher elo is better
            data.rankChange = prev.position - position; // Lower position is better
          }
          data.rank = position + 1;
          // data.bestRank = Math.min(position, prev ? prev.bestRank : Infinity);
          // data.eloBest = Math.max(data.eloRanked, prev ? prev.eloBest : 0);
        });
        return rankings;
      })
      .then((rankings = []) => commit ? Promise.all(rankings.map((data) => writeFile(`./data/users/${data.id}.json`, JSON.stringify(data, undefined, 2))))
          .then(() => rankings) : rankings)
      .then((rankings = []) => writeFile(rankingsPath, JSON.stringify(rankings, undefined, 2))
        .then(() => rankings))
      .then((rankings = []) => {
        const columns = [{
          key: 'rank',
          format: (text = '', {rankChange: rc}) => `<span data-change="${rc === undefined ? '-' : rc}">${text}</span>`,
        }, {
          key: 'level',
          name: 'LV',
        }, {
          key: 'username',
          name: 'Player',
          format: (text = '', { id }) => `<span alt="ID: ${id}">${text}</span>`,
        }, {
          key: 'division',
          format: (text = '') => text.replace('_', ' '),
        }, {
          key: 'eloRanked',
          name: 'Elo',
          format: (text = '', { eloChange: ec }) => `<span data-change="${ec === undefined ? '-' : ec}">${text}</span>`,
        }, {
          key: 'winsRanked',
          name: 'Wins',
        }, {
          key: 'lossesRanked',
          name: 'Losses',
        }];

        const data = [
          `---`,
          `title: ${capitalize(type)} Update`,
          'layout: post',
          `category: ${type}`,
          `---`,
          `| ${columns.map(({ name = '', key = '' }) => name || capitalize(key)).join(' | ')} |`,
          `| ${columns.map(() => '---').join(' | ')} |`,
          `${rankings.map((entry) => `| ${columns.map(({ 
            key = '',
            format = (text, entry) => text,
          }) => format(entry[key], entry)).join(' | ')} |${entry.rank === 5 ? ' <!--more-->' : ''}`).join('\n')}`,
          '{: .leaderboard}',
        ].join('\n');

        // Save post
        const postPath = `./docs/_${type}`;
        return mkdir(postPath, {
          recursive: true,
        }).then(() => writeFile(`${postPath}/${Math.floor(Date.now() / 1000)}.md`, data));
      }));
}

function capitalize(text = '') {
  return text[0].toUpperCase() + text.substring(1);
}

loadChanges(...process.argv.slice(2)).catch(console.error);
