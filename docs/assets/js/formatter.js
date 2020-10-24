const columns = [{
  key: 'rank',
  format: (text = '', { rankChange }) => change(text, rankChange),
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
  format: (text = '', { eloChange }) => change(text, eloChange),
}, {
  key: 'winsRanked',
  format: (text = '', { wins }) => change(text, wins),
}, {
  key: 'lossesRanked',
  format: (text = '', { losses }) => change(text, losses),
}];

function change(text, data) {
  return `<span data-change="${data === undefined ? '-' : data}">${text}</span>`;
}

export default columns;
