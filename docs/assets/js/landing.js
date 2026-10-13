import { extendTable } from './table.js';

document.querySelectorAll('.leaderboard').forEach((table) => {
  const details = table.closest('details');
  if (!details || details.open) extendTable(table);
});

document.addEventListener('toggle', ({ target }) => {
  if (target.open) target.querySelectorAll('.leaderboard').forEach(extendTable);
}, true);
