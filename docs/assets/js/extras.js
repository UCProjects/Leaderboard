export default [{
  name: 'WR',
  format: ({ winsRanked: wins, lossesRanked: losses }) => `${Math.floor(wins / (wins + losses) * 100)}%`,
}];
