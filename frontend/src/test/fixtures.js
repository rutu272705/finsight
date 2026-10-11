export const history = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-09-${String(i + 1).padStart(2, "0")}`, open: 100, high: 102, low: 99, close: 100 + i, volume: 1000, change_pct: i ? 1 : null,
}));

export const article = (over = {}) => ({
  id: 1, title: "Apple beats earnings estimates", source: "Reuters", url: "https://example.com/a", published_at: "2026-10-09T10:00:00+00:00",
  summary: "Apple beats earnings estimates. Revenue rose 8%.", relevance: 1,
  sentiment: { label: "positive", probabilities: { positive: 0.8, negative: 0.05, neutral: 0.15 }, score: 0.75, backend: "lexicon", calibrated: false },
  entities: { companies: ["Apple"], people: [], tickers: [], money: [], percentages: [{ text: "8%", context: "revenue" }], topics: ["Earnings"] },
  explanation: { signals: [{ term: "beats", polarity: "positive", weight: 2 }], note: "Associative, not causal.", summary_basis: "headline_and_snippet" },
  ...over,
});

export const prediction = {
  label: "Upward", probabilities: { Upward: 0.5, Stable: 0.3, Downward: 0.2 }, horizon_days: 5, as_of_date: "2026-10-09",
  predicted_at: "2026-10-10T10:00:00+00:00", model_name: "Random Forest", definition: "Upward: return above +1.0%.",
  disclaimer: "Experimental model forecast. Not financial advice.",
  test_metrics: { accuracy: 0.40, confusion_matrix: { labels: ["Downward", "Stable", "Upward"], matrix: [[1, 2, 3], [2, 3, 1], [1, 1, 4]] } },
  baseline: { accuracy: 0.39 },
};

export const dashboard = (over = {}) => ({
  symbol: "AAPL", profile: { name: "Apple Inc.", exchange: "NASDAQ", currency: "USD" },
  quote: { price: 129, change: 1, change_pct: 0.78, as_of: "2026-09-30" }, in_watchlist: false, history, period: "6mo",
  news: {
    articles: [article()], providers_used: ["googlenews"], warnings: [],
    aggregate: { score: 0.4, label: "positive", n_articles: 1, distribution: { positive: 1, negative: 0, neutral: 0 }, effective_sample_size: 1, low_sample: true, methodology: "Weighted mean." },
    topics: { topics: [{ name: "Earnings", count: 1 }], companies: [{ name: "Apple", count: 1 }], people: [] },
  },
  prediction, sentiment_daily: [{ date: "2026-09-29", score: 0.4, count: 1 }], demo: false, last_updated: "2026-10-10T10:00:00+00:00", ...over,
});
