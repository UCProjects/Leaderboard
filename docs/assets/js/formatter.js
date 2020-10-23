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

export default columns;
