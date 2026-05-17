function detectPatterns(stock) {
  const patterns = [];

  if (Number.isFinite(stock.rsi) && stock.rsi < 30) {
    patterns.push('RSI_OVERSOLD');
  }

  if (Number.isFinite(stock.priceChange) && stock.priceChange > 3) {
    patterns.push('SPIKE');
  }

  if (
    Number.isFinite(stock.volume) &&
    Number.isFinite(stock.avgVolume) &&
    stock.volume > stock.avgVolume
  ) {
    patterns.push('HIGH_VOLUME');
  }

  return patterns;
}

function getPatternKey(patterns = []) {
  return patterns.length > 0 ? [...patterns].sort().join('+') : 'NO_PATTERN';
}

module.exports = { detectPatterns, getPatternKey };
