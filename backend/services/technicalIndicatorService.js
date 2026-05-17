const axios = require('axios');

async function fetchRSI(symbol) {
  try {

    const apiKey = process.env.TWELVE_DATA_API_KEY;

    const url =
      `https://api.twelvedata.com/rsi?symbol=${symbol}` +
      `&interval=1day&time_period=14&apikey=${apiKey}`;

    const { data } = await axios.get(url);

    const rsi =
      Number(data?.values?.[0]?.rsi);

    if (!Number.isFinite(rsi)) {
      return null;
    }

    return rsi;

  } catch (error) {
    return null;
  }
}

module.exports = {
  fetchRSI,
};