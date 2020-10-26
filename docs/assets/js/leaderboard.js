import columns, { extra } from './formatter.js';

// TODO: convert to elements
function load(url) {
  // TODO: load partial entries over time
  return window.axios.get(url).then(ret => {
    const entries = ret.data.map((entry) => columns.map(({
      key = '',
      format = (text, entry) => text,
    }) => `<td>${format(entry[key], entry)}</td>`).join('') + extra.map(({ format }) => `<td>${format(entry)}</td>`).join(''));

    const header = document.querySelector('.leaderboard thead tr');
    extra.forEach(({ name }) => {
      const el = document.createElement('th');
      el.innerText = name;
      header.append(el);
    });

    const safe = window.getComputedStyle(document.querySelector('.mobile-warning')).display === 'none';
    const body = document.querySelector('.leaderboard tbody');
    
    body.innerHTML = '';
    addEntries(entries, safe ? 500 : 100, safe ? 100 : 1000, safe, body);
  });
}

// TODO: make a loader that detects when near the end of the list, and expand it
function addEntries(entries = [], limit = 100, delay = 1000, safe, body, runs = 0) {
  if (!entries.length || safe === false && runs >= 500) return;

  const text = `<tr>${entries.splice(0, limit).join('</tr></tr>')}</tr>`;
  body.innerHTML += text;

  setTimeout(addEntries, delay, entries, limit, delay, safe, body, runs + limit);
}

load(dataURL);
