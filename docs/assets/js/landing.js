import { extendTable } from './table.js';

document.querySelectorAll('.leaderboard').forEach((table) => {
  if (!table.closest('details')) extendTable(table);
});

document.addEventListener('toggle', ({ target }) => {
  if (target.open) target.querySelectorAll('.leaderboard').forEach(extendTable);
}, true);
