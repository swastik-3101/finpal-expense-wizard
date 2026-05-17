const Groq = require("groq-sdk");

const DEFAULT_MODEL = "llama-3.1-8b-instant";

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_STOCKS;
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return "unknown";
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function buildFallbackAnalysis(recommendation) {
  const confidence = formatPercent(recommendation.confidence);
  const pattern = recommendation.pattern || "NO_PATTERN";
  return `${recommendation.symbol} matches ${pattern}, which has a learned confidence of ${confidence} from ${recommendation.successCount || 0} successes and ${recommendation.failCount || 0} failures. Treat this as a watchlist signal and confirm it with current price action before making a decision.`;
}

function buildPrompt(recommendations) {
  const stockData = recommendations.map((item) => ({

    symbol: item.symbol,

    pattern: item.pattern,

    confidence: item.confidence,

    successCount: item.successCount,

    failCount: item.failCount,

    price: item.price,

    volume: item.volume,

    rsi: item.rsi,

    patterns: item.patterns,

    previousSnapshotPrice:
      item.previousSnapshotPrice,

    changeFromPreviousSnapshot:
      item.changeFromPreviousSnapshot,

    riskLevel:
      item.confidence >= 0.75
        ? 'low'
        : item.confidence >= 0.6
        ? 'medium'
        : 'high',

    recommendationReason:
      `Matched ${item.pattern} with ${(item.confidence * 100).toFixed(1)}% historical confidence.`,
}));

  return `You are FinPal's AI-powered stock analysis assistant.

Use ONLY the structured stock data below.

Do NOT invent:
- stock symbols
- prices
- news
- indicators
- historical performance

Explain:
- why each stock was selected
- detected technical patterns
- confidence score
- RSI interpretation
- volume behavior
- risk level
- historical learning quality

Keep each explanation concise but insightful.

Return ONLY valid JSON:
[
  {
    "symbol": "AAPL",
    "analysis": "..."
  }
]

Stock recommendations:
${JSON.stringify(stockData, null, 2)}`;
}

function parseAnalysisResponse(content) {
  const trimmed = content.trim();
  const jsonStart = trimmed.indexOf("[");
  const jsonEnd = trimmed.lastIndexOf("]");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error("AI response did not contain a JSON array");
  }

  const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
  if (!Array.isArray(parsed)) {
    throw new Error("AI response JSON was not an array");
  }

  return parsed.reduce((acc, item) => {
    if (item && item.symbol && item.analysis) {
      acc[String(item.symbol).toUpperCase()] = String(item.analysis);
    }
    return acc;
  }, {});
}

async function addAiAnalysisToRecommendations(recommendations) {
  if (!recommendations.length) {
    return { recommendations, aiAnalysisEnabled: false };
  }

  const maxAiRecommendations =
    Number(process.env.STOCK_ANALYSIS_MAX_RECOMMENDATIONS) || 8;
  const aiRecommendations = recommendations.slice(0, maxAiRecommendations);
  const overflowRecommendations = recommendations.slice(maxAiRecommendations);

  const groq = getGroqClient();
  if (!groq) {
    return {
      recommendations: recommendations.map((item) => ({
        ...item,
        analysis: buildFallbackAnalysis(item),
        analysisSource: "fallback",
      })),
      aiAnalysisEnabled: false,
      analysisMessage:
        "GROQ_API_KEY is not configured; returned rule-based explanations.",
    };
  }

  try {
    const completion = await groq.chat.completions.create({
      model: process.env.STOCK_ANALYSIS_MODEL || DEFAULT_MODEL,
      messages: [{ role: "user", content: buildPrompt(aiRecommendations) }],
      max_tokens: 900,
      temperature: 0.4,
    });

    const content = completion.choices?.[0]?.message?.content || "";
    const analysisBySymbol = parseAnalysisResponse(content);

    return {
      recommendations: [
        ...aiRecommendations.map((item) => ({
          ...item,
          analysis:
            analysisBySymbol[item.symbol?.toUpperCase()] ||
            buildFallbackAnalysis(item),
          analysisSource: analysisBySymbol[item.symbol?.toUpperCase()]
            ? "ai"
            : "fallback",
        })),
        ...overflowRecommendations.map((item) => ({
          ...item,
          analysis: buildFallbackAnalysis(item),
          analysisSource: "fallback",
        })),
      ],
      aiAnalysisEnabled: true,
      analysisMessage: overflowRecommendations.length
        ? `AI analysis was limited to ${maxAiRecommendations} recommendations to control token usage; the rest use rule-based explanations.`
        : undefined,
    };
  } catch (error) {
    console.error("Stock AI analysis failed:", error.message);
    return {
      recommendations: recommendations.map((item) => ({
        ...item,
        analysis: buildFallbackAnalysis(item),
        analysisSource: "fallback",
      })),
      aiAnalysisEnabled: false,
      analysisMessage: "AI analysis failed; returned rule-based explanations.",
    };
  }
}

module.exports = { addAiAnalysisToRecommendations };
