function detectPatterns(stock) {

  const patterns = [];

  // Oversold
  if (
    Number.isFinite(stock.rsi) &&
    stock.rsi < 30
  ) {
    patterns.push('RSI_OVERSOLD');
  }

  // Overbought
  if (
    Number.isFinite(stock.rsi) &&
    stock.rsi > 70
  ) {
    patterns.push('RSI_OVERBOUGHT');
  }

  // Price spike
  if (
    Number.isFinite(stock.priceChange) &&
    stock.priceChange > 3
  ) {
    patterns.push('SPIKE');
  }

  // High volume
  if (
    Number.isFinite(stock.volume) &&
    Number.isFinite(stock.avgVolume) &&
    stock.volume > stock.avgVolume * 1.5
  ) {
    patterns.push('HIGH_VOLUME');
  }

  // Bullish momentum
  if (
    Number.isFinite(stock.priceChange) &&
    stock.priceChange > 5 &&
    Number.isFinite(stock.rsi) &&
    stock.rsi > 55
  ) {
    patterns.push('MOMENTUM_BULLISH');
  }

  // Strong volume surge
  if (
    Number.isFinite(stock.volume) &&
    Number.isFinite(stock.avgVolume) &&
    stock.volume > stock.avgVolume * 2
  ) {
    patterns.push('VOLUME_SURGE');
  }

  // RSI recovering from weakness
  if (
    Number.isFinite(stock.rsi) &&
    stock.rsi > 30 &&
    stock.rsi < 45 &&
    Number.isFinite(stock.priceChange) &&
    stock.priceChange > 2
  ) {
    patterns.push('RSI_RECOVERY');
  }

  // Strong breakout setup
  if (
    Number.isFinite(stock.priceChange) &&
    stock.priceChange > 8 &&
    Number.isFinite(stock.volume) &&
    stock.volume > 10000000
  ) {
    patterns.push('MOMENTUM_BREAKOUT');
  }

  // Dip-buy setup
  if (
    Number.isFinite(stock.priceChange) &&
    stock.priceChange < -4 &&
    Number.isFinite(stock.rsi) &&
    stock.rsi < 35
  ) {
    patterns.push('DIP_BUY_SETUP');
  }

  // Stable bullish movement
  if (
    Number.isFinite(stock.priceChange) &&
    stock.priceChange > 1 &&
    stock.priceChange < 4 &&
    Number.isFinite(stock.rsi) &&
    stock.rsi > 50 &&
    stock.rsi < 65
  ) {
    patterns.push('STEADY_STRENGTH');
  }

  return patterns;
}

function getPatternKey(patterns = []) {

  return patterns.length > 0
    ? [...patterns].sort().join('+')
    : 'NO_PATTERN';
}

module.exports = {
  detectPatterns,
  getPatternKey,
};