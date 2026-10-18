const started = Date.now();

module.exports = (message) => {
  console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${message}`);
};
