import { Card } from "../components/ui.jsx";

const Item = ({ t, children }) => (
  <div>
    <h3 className="text-sm font-semibold text-slate-900">{t}</h3>
    <p className="mt-1 text-sm leading-relaxed text-slate-600">{children}</p>
  </div>
);

export default function About() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">How FinSight works</h1>
        <p className="mt-1 text-sm text-slate-500">System architecture, machine learning models, and methodology.</p>
      </div>
      <Card title="Pipeline">
        <div className="space-y-4">
          <Item t="1. Data">Prices come from Yahoo Finance (yfinance). Headlines come from NewsAPI when a key is configured, plus Google News and Yahoo Finance feeds. Duplicate stories are removed by URL and by near-identical headlines.</Item>
          <Item t="2. Sentiment">Each article is scored positive, negative or neutral. The default scorer is a finance-specific word list with negation and intensity handling; FinBERT can be switched on for higher accuracy. The company score is a weighted average that favours relevant, recent articles.</Item>
          <Item t="3. Entities and summaries">Organisations, people, tickers, money amounts and percentages are extracted. A figure is labelled “revenue” or “profit” only when such a word sits next to it. Summaries reuse sentences from the article, so they cannot add facts that were not in the source.</Item>
          <Item t="4. Trend model">Three classifiers (logistic regression, random forest, gradient boosting) learn from price indicators and recent news sentiment. They are trained on earlier dates and tested on later ones, with a gap so labels never overlap. The best model by walk-forward validation makes the forecast.</Item>
        </div>
      </Card>
      <Card title="Limitations to keep in mind">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>Forecasts are experimental. Short-term stock moves are close to random, and the model's accuracy is compared with a naive baseline on every dashboard.</li>
          <li>Free news sources only reach back a few weeks, so historic sentiment is sparse and the model leans mostly on prices.</li>
          <li>Sentiment from headlines misses sarcasm, context and anything not stated in the headline or snippet.</li>
          <li>Correlation between sentiment and returns does not show that news caused the price move. Prices often move before articles are written.</li>
          <li>Data can be delayed or unavailable. When a source fails, FinSight says so instead of showing placeholder numbers.</li>
        </ul>
      </Card>
      <p className="text-xs text-slate-400">FinSight is an educational project for learning. Nothing here is financial advice.</p>
    </div>
  );
}
