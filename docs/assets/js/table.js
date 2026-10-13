import { extra } from './formatter.js';

const headerKeys = {
  Wins: 'winsRanked',
  Losses: 'lossesRanked',
};

export function addHeaders(table) {
  const header = table.querySelector('thead tr');
  extra.forEach(({ name }) => {
    const el = document.createElement('th');
    el.textContent = name;
    header.append(el);
  });
}

export function extendTable(table) {
  if (table.dataset.extended) return;
  table.dataset.extended = 'true';
  const keys = [...table.querySelectorAll('thead th')]
    .map((el) => headerKeys[el.textContent.trim()]);
  addHeaders(table);
  table.querySelectorAll('tbody tr').forEach((row) => {
    const entry = {};
    [...row.children].forEach((cell, i) => {
      if (keys[i]) entry[keys[i]] = Number(cell.textContent);
    });
    row.insertAdjacentHTML('beforeend', extra.map(({ format }) => `<td>${format(entry)}</td>`).join(''));
  });
}
