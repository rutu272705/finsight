export default function About() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Broadsheet Section Header */}
      <div className="border-b-2 border-black pb-4">
        <span className="broadsheet-kicker">Technical Architecture & Disclosures</span>
        <h1 className="font-serif font-black text-3xl sm:text-5xl text-stone-950 mt-1">
          How FinSight Works
        </h1>
        <p className="text-xs text-stone-500 font-serif italic mt-1">
          The natural language processing pipeline, walk-forward predictive algorithms, and statistical boundaries.
        </p>
      </div>

      <div className="border border-stone-200 p-6 sm:p-8 bg-white space-y-6">
        <h2 className="font-serif font-bold text-xl text-stone-900 border-b border-black pb-2">
          The FinSight Analytical Pipeline
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 text-xs font-serif leading-relaxed">
          <div className="border-l-2 border-stone-900 pl-4 space-y-1">
            <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-stone-900">1. Market & News Sourcing</h3>
            <p className="text-stone-700">
              Pricing records are ingested via Yahoo Finance (yfinance). News feeds are sourced from NewsAPI alongside Google News and Yahoo RSS dispatches. Redundant and syndicated stories are deduplicated by URL hashing and headline text distance.
            </p>
          </div>

          <div className="border-l-2 border-stone-900 pl-4 space-y-1">
            <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-stone-900">2. Domain-Tuned Sentiment</h3>
            <p className="text-stone-700">
              Every headline and excerpt is classified positive, negative, or neutral. The default engine utilizes finance-specific lexical dictionaries handling negation, modifier intensity, and fiscal contexts. An optional FinBERT transformer backend can be activated for deep attention-based contextual nuances.
            </p>
          </div>

          <div className="border-l-2 border-stone-900 pl-4 space-y-1">
            <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-stone-900">3. Entity Extraction & Synthesis</h3>
            <p className="text-stone-700">
              Corporations, executives, monetary totals, and percentages are tagged via named entity recognition. Figures are only classified as revenue or net earnings when anchored by contextual tokens. Extractive summaries preserve original source sentences to eliminate hallucinations.
            </p>
          </div>

          <div className="border-l-2 border-stone-900 pl-4 space-y-1">
            <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-stone-900">4. Predictive Machine Learning</h3>
            <p className="text-stone-700">
              Three algorithmic classifiers (logistic regression, random forest, gradient boosting) evaluate technical momentum indicators and recent sentiment scores. They undergo walk-forward chronological backtesting with a safety gap to prevent label leakage.
            </p>
          </div>
        </div>
      </div>

      <div className="border border-stone-900 p-6 sm:p-8 bg-stone-50/50 space-y-4">
        <h2 className="font-serif font-bold text-lg text-stone-900 border-b border-stone-300 pb-2">
          Methodological Limitations to Keep in Mind
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-xs text-stone-700 font-serif leading-relaxed">
          <li>
            <strong>Forecasts are experimental:</strong> Short-term equity oscillations possess substantial stochastic randomness. Every forecast is benchmarked directly against a naive baseline so users can observe when signal is present.
          </li>
          <li>
            <strong>Historical news sparsity:</strong> Free tier news sources span only recent weeks, so multi-year historical training necessarily relies primarily on price indicators.
          </li>
          <li>
            <strong>Headline limitations:</strong> Headlines inherently lack full contextual nuance, irony, and internal paragraph qualifiers.
          </li>
          <li>
            <strong>Correlation is not causality:</strong> Positive news sentiment following a price run often reflects post-hoc reporting rather than predictive causality.
          </li>
          <li>
            <strong>Educational disclosure:</strong> FinSight is an educational research and engineering demonstration. Nothing contained herein constitutes financial advice.
          </li>
        </ul>
      </div>

      <p className="text-[11px] text-stone-400 font-serif italic text-center">
        FinSight · Natural Language Processing Intelligence Platform · 2026
      </p>
    </div>
  );
}
