const columns = [{
  key: 'rank',
  format: (text = '', {rankChange: rc}) => `<span data-change="${rc === undefined ? '-' : rc}">${text}</span>`,
}, {
  key: 'level',
}, {
  key: 'username',
  format: (text = '', { id }) => `<span title="ID: ${id}">${text}</span>`,
}, {
  key: 'division',
  format: (text = '') => text.replace('_', ' '),
}, {
  key: 'eloRanked',
  format: (text = '', { eloChange: ec }) => `<span data-change="${ec === undefined ? '-' : ec}">${text}</span>`,
}, {
  key: 'winsRanked',
}, {
  key: 'lossesRanked',
}];

export function load(url) {
  // TODO: load partial entries over time
  return window.axios.get(url).then(ret => {
    const entries = ret.data.slice(5).map((entry) => columns.map(({
      key = '',
      format = (text, entry) => text,
    }) => format(entry[key], entry))
    .map((text) => `<td>${text}</td>`).join(''));

    addEntries(entries);
  });
}

function addEntries(entries = [], limit = 100) {
  if (!entries.length) return;
  
  const el = document.querySelector('.leaderboard tbody');

  const text = entries.splice(0, limit).join('</tr></tr>');
  el.innerHTML += `<tr>${text}</tr>`;

  window.requestAnimationFrame(() => addEntries(entries, limit));
}

load(dataURL);
