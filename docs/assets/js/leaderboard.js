import columns, { extra } from './formatter.js';
import { addHeaders, extendTable } from './table.js';

// TODO: convert to elements
async function load(url) {
  // TODO: load partial entries over time
  const table = document.querySelector('.leaderboard');
  const res = await fetch(url);
  if (res.status === 404) {
    const note = document.createElement('p');
    note.className = 'data-unavailable';
    note.textContent = 'The full ranking for this update is no longer available.';
    table.after(note);
    extendTable(table);
    return;
  }
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const data = await res.json();
  const entries = data.map((entry) => columns.map(({
    key = '',
    format = (text, entry) => text,
  }) => `<td>${format(entry[key], entry)}</td>`).join('') + extra.map(({ format }) => `<td>${format(entry)}</td>`).join(''));

  addHeaders(table);

  const safe = window.getComputedStyle(document.querySelector('.mobile-warning')).display === 'none';
  const body = table.querySelector('tbody');

  body.innerHTML = '';
  addEntries(entries, safe ? 500 : 100, safe ? 100 : 1000, safe, body);
}

// TODO: make a loader that detects when near the end of the list, and expand it
function addEntries(entries = [], limit = 100, delay = 1000, safe, body, runs = 0) {
  if (!entries.length || safe === false && runs >= 500) return;

  const text = `<tr>${entries.splice(0, limit).join('</tr></tr>')}</tr>`;
  body.innerHTML += text;

  setTimeout(addEntries, delay, entries, limit, delay, safe, body, runs + limit);
}

load(dataURL);
