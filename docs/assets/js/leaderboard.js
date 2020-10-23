import columns from './formatter.js';

// TODO: convert to elements
function load(url) {
  // TODO: load partial entries over time
  return window.axios.get(url).then(ret => {
    const entries = ret.data.slice(5).map((entry) => columns.map(({
      key = '',
      format = (text, entry) => text,
    }) => `<td>${format(entry[key], entry)}</td>`).join(''));

    addEntries(entries);
  });
}

// TODO: make a loader that detects when near the end of the list, and expand it
function addEntries(entries = [], limit = 100, delay = 1000, safe, runs = 0) {
  if (!entries.length || safe === false && runs >= 500) return;
  if (safe === undefined) {
    const el = document.querySelector('.mobile-warning');
    safe = window.getComputedStyle(el).display === 'none';
    if (safe) {
      delay = 100;
      limit = 500;
    }
  }

  const text = `<tr>${entries.splice(0, limit).join('</tr></tr>')}</tr>`;
  document.querySelector('.leaderboard tbody').innerHTML += text;

  setTimeout(addEntries, delay, entries, limit, delay, safe, runs + limit);
}

load(dataURL);
