function isValidStock(stock) {
  const symbol = (stock.symbol || stock.ticker || '').toUpperCase();

  if (!symbol) return false;

  // Reject warrants/SPAC junk
  const bannedSuffixes = ['W', 'R', 'U'];

  if (
    bannedSuffixes.some((suffix) =>
      symbol.endsWith(suffix)
    )
  ) {
    return false;
  }

  const price = Number(stock.price);

  // Reject penny stocks
  if (!Number.isFinite(price) || price < 5) {
    return false;
  }

  const volume = Number(stock.volume);

  // Reject illiquid stocks
  if (!Number.isFinite(volume) || volume < 500000) {
    return false;
  }

  return true;
}

module.exports = {
  isValidStock,
};