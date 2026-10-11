import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, RefreshCw, Star, ChevronDown, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { api } from "../api.js";
import { useApi } from "../hooks/useApi.js";
import { changeColor, dateTime, money, pct } from "../format.js";
import { Card, DashboardSkeleton, EmptyState, ErrorState, Unavailable, Disclaimer } from "../components/ui.jsx";
import PredictionCard from "../components/PredictionCard.jsx";
import { SentimentSummary } from "../components/SentimentPanels.jsx";
import TopicBars from "../components/TopicBars.jsx";
import ArticleCard from "../components/ArticleCard.jsx";

const PriceChart = lazy(() => import("../components/PriceChart.jsx"));
const SentimentDonut = lazy(() => import("../components/SentimentDonut.jsx"));

const POPULAR_LIST = [
  { sym: "AAPL", name: "Apple Inc.", ex: "NASDAQ" },
  { sym: "TSLA", name: "Tesla, Inc.", ex: "NASDAQ" },
  { sym: "NVDA", name: "NVIDIA Corp.", ex: "NASDAQ" },
  { sym: "RELIANCE.NS", name: "Reliance Industries", ex: "NSE" },
  { sym: "TCS.NS", name: "Tata Consultancy", ex: "NSE" },
];

function BroadsheetWire({ recent, onPick, currentSymbol }) {
  return (
    <aside className="space-y-6 lg:border-r lg:border-stone-200 lg:pr-6">
      {/* Latest Articles / Wire */}
      <div>
        <h3 className="font-serif italic font-bold text-base text-stone-900 border-b border-black pb-1 mb-3">
          Market Wire
        </h3>
        <ul className="space-y-2 text-xs divide-y divide-stone-100">
          <li className="pt-1">
            <span className="font-sans font-bold text-stone-500 uppercase text-[9px] block">Global Macro</span>
            <p className="font-serif text-stone-800 leading-snug hover:text-black cursor-pointer" onClick={() => onPick("AAPL")}>
              Central bank interest rate decisions guide equity valuation multiples.
            </p>
          </li>
          <li className="pt-2">
            <span className="font-sans font-bold text-stone-500 uppercase text-[9px] block">Earnings Watch</span>
            <p className="font-serif text-stone-800 leading-snug hover:text-black cursor-pointer" onClick={() => onPick("NVDA")}>
              Semiconductor demand surge bolsters quarterly forecasts and guidance.
            </p>
          </li>
          <li className="pt-2">
            <span className="font-sans font-bold text-stone-500 uppercase text-[9px] block">Energy & Commodities</span>
            <p className="font-serif text-stone-800 leading-snug hover:text-black cursor-pointer" onClick={() => onPick("RELIANCE.NS")}>
              Refinery margins fluctuate amid changing international trade policies.
            </p>
          </li>
        </ul>
      </div>

      {/* Most Popular Tickers (Numbered 1 to 5 exactly like the newspaper image) */}
      <div className="border-t border-stone-200 pt-5">
        <h3 className="font-serif italic font-bold text-base text-stone-900 border-b border-black pb-1 mb-3">
          Most Popular
        </h3>
        <ol className="space-y-3">
          {POPULAR_LIST.map((item, index) => (
            <li key={item.sym} className="flex items-start gap-3 group">
              <span className="font-serif italic font-black text-2xl text-stone-400 group-hover:text-black leading-none w-5 text-right shrink-0">
                {index + 1}
              </span>
              <button
                type="button"
                className="text-left flex-1"
                onClick={() => onPick(item.sym)}
              >
                <p className="font-serif font-bold text-xs text-stone-900 group-hover:underline leading-snug">
                  {item.name}
                </p>
                <p className="text-[10px] text-stone-500 uppercase tracking-wider font-sans">
                  <span className="font-bold text-stone-800">{item.sym}</span> · {item.ex}
                </p>
              </button>
            </li>
          ))}
        </ol>
      </div>

      {/* Recently Searched */}
      {recent?.length > 0 && (
        <div className="border-t border-stone-200 pt-5">
          <h3 className="font-serif italic font-bold text-base text-stone-900 border-b border-stone-200 pb-1 mb-3">
            Recently Searched
          </h3>
          <ul className="space-y-1.5 text-xs">
            {recent.map((r) => (
              <li key={r.symbol}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left py-1 hover:text-black group"
                  onClick={() => onPick(r.symbol)}
                >
                  <span className="truncate text-stone-700 font-serif group-hover:underline">{r.name || r.symbol}</span>
                  <span className="font-sans font-bold text-[10px] text-stone-500 bg-stone-100 px-1 border border-stone-200">
                    {r.symbol}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

function Home({ onPick }) {
  const { data: recent } = useApi((s) => api.history(s), []);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Market Wire & Most Popular */}
      <div className="lg:col-span-3">
        <BroadsheetWire recent={recent} onPick={onPick} />
      </div>

      {/* Center Column: Breaking Lead Story */}
      <div className="lg:col-span-6 lg:border-r lg:border-stone-200 lg:pr-8 space-y-6">
        <div>
          <span className="broadsheet-kicker">Lead Editorial & Market Intelligence</span>
          <h2 className="font-serif font-black text-3xl sm:text-5xl text-stone-950 tracking-tight leading-tight mt-1">
            Read the news the way the market does.
          </h2>
          <div className="mt-2 text-xs text-stone-500 font-serif italic border-b border-stone-200 pb-3">
            By Quantitative NLP Editorial Desk · Published Daily
          </div>
          <p className="mt-4 font-serif text-sm sm:text-base leading-relaxed text-stone-800">
            Search any publicly traded corporation to examine how recent financial press classifies sentiment, extracts named entities and financial metrics, and predicts the next five trading sessions via walk-forward machine learning models.
          </p>
        </div>

        {/* Quick Ticker Launcher Box */}
        <div className="border border-stone-900 p-5 bg-stone-50/50">
          <p className="font-sans text-xs font-bold uppercase tracking-wider text-stone-900 mb-2.5">
            Select an active market company to begin analysis
          </p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_LIST.map((item) => (
              <button
                key={item.sym}
                className="btn"
                onClick={() => onPick(item.sym)}
              >
                {item.sym}
              </button>
            ))}
          </div>
        </div>

        {/* Lead Analysis Preview Story */}
        <div className="border-t border-stone-200 pt-5 space-y-3">
          <span className="broadsheet-kicker">Methodology Spotlight</span>
          <h3 className="font-serif font-bold text-xl text-stone-900">
            Natural Language Processing vs. Traditional Price Volatility
          </h3>
          <p className="font-serif text-xs text-stone-700 leading-relaxed">
            Short-term market oscillations often defy simplistic sentiment heuristics. FinSight benchmarks every classification against a naive baseline, revealing when news signals genuinely lead price discovery versus when noise dominates.
          </p>
          <Link to="/about" className="inline-block text-xs font-bold uppercase tracking-wider text-stone-900 hover:underline">
            Read Full Methodology Report →
          </Link>
        </div>
      </div>

      {/* Right Column: Daily Feed & Methodology Brief */}
      <div className="lg:col-span-3 space-y-6">
        <div>
          <h3 className="font-serif italic font-bold text-base text-stone-900 border-b border-black pb-1 mb-3">
            Daily Feed
          </h3>
          <div className="space-y-4 text-xs font-serif divide-y divide-stone-100">
            <div className="pt-2">
              <span className="broadsheet-kicker">NLP Lexicon</span>
              <h4 className="font-bold text-stone-900 mt-0.5">Finance-Specific Terminology</h4>
              <p className="text-stone-600 mt-1 leading-snug">
                Every headline is scored positive, negative, or neutral through domain-tuned financial lexicons accounting for negation and intensity.
              </p>
            </div>
            <div className="pt-3">
              <span className="broadsheet-kicker">Machine Learning</span>
              <h4 className="font-bold text-stone-900 mt-0.5">Walk-Forward Model Validation</h4>
              <p className="text-stone-600 mt-1 leading-snug">
                Three classifiers compete under rolling backtests with strict label separation to avert data snooping.
              </p>
            </div>
            <div className="pt-3">
              <span className="broadsheet-kicker">Entity Extraction</span>
              <h4 className="font-bold text-stone-900 mt-0.5">Named Organisations & Figures</h4>
              <p className="text-stone-600 mt-1 leading-snug">
                Extracts dollar sums, revenues, and key executives from coverage text.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyHeader({ d, onRefresh, refreshing, refreshError, watching, onToggleWatch, watchBusy }) {
  const { profile, quote, symbol } = d;
  const [showExport, setShowExport] = useState(false);

  return (
    <section className="border-b-2 border-black pb-5">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <span className="broadsheet-kicker">Lead Equity Coverage · {profile.exchange || "Stock Market"}</span>
          <h1 className="font-serif font-black text-3xl sm:text-5xl text-stone-950 tracking-tight mt-0.5">
            {profile.name}
          </h1>
          <p className="mt-1 text-xs text-stone-500 font-sans">
            Ticker Symbol <strong className="text-stone-900 font-bold">{symbol}</strong>
            {profile.currency ? ` · Currency in ${profile.currency}` : ""}
          </p>
        </div>

        <div className="text-right">
          <p className="font-serif font-black text-3xl sm:text-5xl tracking-tight text-stone-950" aria-label="Latest price">
            {money(quote.price, profile.currency)}
          </p>
          <p className={`mt-0.5 text-xs font-bold font-sans ${changeColor(quote.change)}`}>
            {quote.change > 0 ? "+" : ""}
            {quote.change.toFixed(2)} ({pct(quote.change_pct)}) <span className="font-normal text-stone-500">as of {quote.as_of}</span>
          </p>
        </div>
      </div>

      {/* Action Controls & Broadsheet Dateline */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-3 text-xs text-stone-600 font-sans">
        <p className="font-serif italic text-stone-500">
          Last updated {dateTime(d.last_updated)}
          {d.demo && " · synthetic broadsheet data"}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`btn ${watching ? "border-black bg-stone-100 text-stone-950 font-bold" : ""}`}
            onClick={onToggleWatch}
            disabled={watchBusy}
            aria-pressed={watching}
          >
            <Star className={`h-3.5 w-3.5 ${watching ? "fill-black text-black" : "text-stone-500"}`} aria-hidden />{" "}
            {watching ? "On watchlist" : "Add to watchlist"}
          </button>

          <div className="relative">
            <div className="flex items-center">
              <a className="btn border-r-0" href={api.exportUrl(symbol, "articles")}>
                <Download className="h-3.5 w-3.5 text-stone-600" aria-hidden /> Export CSV
              </a>
              <button
                type="button"
                onClick={() => setShowExport(!showExport)}
                className="btn !px-1.5"
                aria-label="More export formats"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            {showExport && (
              <div
                className="absolute right-0 z-30 mt-1 w-44 border border-stone-900 bg-white py-1 shadow-lg text-xs"
                onMouseLeave={() => setShowExport(false)}
              >
                <a
                  href={api.exportUrl(symbol, "articles")}
                  className="block px-3 py-1.5 text-stone-800 hover:bg-stone-100 font-serif"
                  onClick={() => setShowExport(false)}
                >
                  Articles analysis CSV
                </a>
                <a
                  href={api.exportUrl(symbol, "prices")}
                  className="block px-3 py-1.5 text-stone-800 hover:bg-stone-100 font-serif"
                  onClick={() => setShowExport(false)}
                >
                  Historical Prices CSV
                </a>
                <a
                  href={api.exportUrl(symbol, "predictions")}
                  className="block px-3 py-1.5 text-stone-800 hover:bg-stone-100 font-serif"
                  onClick={() => setShowExport(false)}
                >
                  Predictions CSV
                </a>
              </div>
            )}
          </div>

          <button className="btn" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 text-stone-600 ${refreshing ? "animate-spin" : ""}`} aria-hidden /> Refresh data
          </button>
        </div>

        {refreshError && <p role="alert" className="w-full text-xs font-serif font-bold text-amber-800">{refreshError}</p>}
      </div>
    </section>
  );
}

export default function Dashboard({ onPick }) {
  const { symbol } = useParams();
  const sym = symbol ? decodeURIComponent(symbol).toUpperCase() : null;
  const [period, setPeriod] = useState("6mo");
  const [override, setOverride] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [watching, setWatching] = useState(null);
  const [watchBusy, setWatchBusy] = useState(false);

  const { data, error, loading, reload } = useApi((signal) => (sym ? api.dashboard(sym, { period }, signal) : null), [sym, period]);
  const { data: recentHistory } = useApi((s) => api.history(s), []);

  useEffect(() => {
    setOverride(null);
    setRefreshError("");
    setWatching(null);
  }, [sym, period]);
  useEffect(() => {
    document.title = sym ? `${sym} · The FinSight Chronicle` : "The FinSight Chronicle";
  }, [sym]);

  if (!sym) return <Home onPick={onPick} />;
  if (loading && !data) return <DashboardSkeleton />;
  if (error) return <ErrorState error={error} onRetry={reload} title={`Couldn't load ${sym}`} />;
  if (!data) return null;

  const d = override || data;
  const isWatching = watching ?? d.in_watchlist;

  const refresh = async () => {
    setRefreshing(true);
    setRefreshError("");
    try {
      const r = await api.dashboard(sym, { period, refresh: true });
      setOverride(r.data);
    } catch (e) {
      setRefreshError(e.message);
    } finally {
      setRefreshing(false);
    }
  };
  const toggleWatch = async () => {
    setWatchBusy(true);
    try {
      if (isWatching) await api.removeWatch(sym);
      else await api.addWatch(sym, d.profile.name);
      setWatching(!isWatching);
    } catch (e) {
      setRefreshError(e.message);
    } finally {
      setWatchBusy(false);
    }
  };

  const news = d.news;
  const newsDown = news.unavailable;
  const articles = newsDown ? [] : news.articles;

  return (
    <div className="space-y-8">
      {/* Lead Company Header */}
      <CompanyHeader
        d={d}
        onRefresh={refresh}
        refreshing={refreshing}
        refreshError={refreshError}
        watching={isWatching}
        onToggleWatch={toggleWatch}
        watchBusy={watchBusy}
      />

      {/* 3-Column Broadsheet Layout (Exactly like the uploaded newspaper format) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Column 1: Market Wire & Most Popular */}
        <div className="lg:col-span-3">
          <BroadsheetWire recent={recentHistory} onPick={onPick} currentSymbol={sym} />
        </div>

        {/* Column 2: Breaking News & Centerpiece Price/Forecast */}
        <div className="lg:col-span-6 lg:border-r lg:border-stone-200 lg:pr-8 space-y-6">
          <h2 className="font-serif italic font-bold text-xl text-stone-900 border-b border-black pb-1">
            Breaking News & Market Action
          </h2>

          {/* Price Action Broadsheet Chart */}
          <div className="border border-stone-200 p-4">
            <h3 className="font-serif font-bold text-sm text-stone-900 mb-1">
              Historical Price Action & Trading Volume
            </h3>
            <Suspense fallback={<div role="status" className="flex min-h-[320px] items-center justify-center text-xs text-stone-500">Loading price chart...</div>}>
              <PriceChart
                history={d.history}
                sentimentDaily={d.sentiment_daily}
                period={period}
                onPeriod={setPeriod}
                currency={d.profile.currency}
              />
            </Suspense>
          </div>

          {/* Model Trend Prediction Box */}
          <div className="border border-stone-900 p-4 bg-stone-50/30">
            <h3 className="font-serif font-bold text-sm text-stone-900 mb-1">
              Experimental Machine Learning Forecast
            </h3>
            <PredictionCard prediction={d.prediction} symbol={sym} />
          </div>
        </div>

        {/* Column 3: Daily Feed & Sentiment Pulse */}
        <div className="lg:col-span-3 space-y-6">
          <h2 className="font-serif italic font-bold text-xl text-stone-900 border-b border-black pb-1">
            Daily Feed
          </h2>

          {newsDown ? (
            <div className="border border-stone-200 p-4 text-center">
              <p className="text-xs text-stone-500 font-serif italic">
                Sentiment feed suspended while upstream dispatches are unavailable.
              </p>
            </div>
          ) : (
            <>
              {/* Sentiment Summary Score */}
              <div className="border border-stone-200 p-4">
                <h3 className="font-serif font-bold text-sm text-stone-900 mb-2">
                  Editorial Sentiment Score
                </h3>
                <SentimentSummary aggregate={news.aggregate} />
              </div>

              {/* Sentiment Donut Breakdown */}
              <div className="border border-stone-200 p-4">
                <h3 className="font-serif font-bold text-sm text-stone-900 mb-2">
                  Polarity Distribution
                </h3>
                <Suspense fallback={<div role="status" className="flex min-h-28 items-center justify-center text-xs text-stone-500">Loading chart...</div>}>
                  <SentimentDonut distribution={news.aggregate.distribution} />
                </Suspense>
              </div>

              {/* Financial Topics */}
              <div className="border border-stone-200 p-4">
                <h3 className="font-serif font-bold text-sm text-stone-900 mb-2">
                  Key Financial Topics
                </h3>
                <TopicBars items={news.topics.topics.slice(0, 5)} />
              </div>

              {/* Named Organisations */}
              <div className="border border-stone-200 p-4">
                <h3 className="font-serif font-bold text-sm text-stone-900 mb-2">
                  Mentioned Organisations
                </h3>
                <TopicBars items={news.topics.companies.slice(0, 5)} color="#15803d" emptyText="No organisations recognised." />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lower Section: Featured Stories (Full-Width 3-Column Grid Referenced From Image) */}
      <div className="border-t-2 border-black pt-6">
        <div className="flex items-center justify-between mb-6 border-b border-stone-200 pb-2">
          <h2 className="font-serif italic font-black text-2xl sm:text-3xl text-stone-950">
            Featured Stories & Corporate News Coverage
          </h2>
          <Link to={`/news/${sym}`} className="text-xs font-bold uppercase tracking-wider text-stone-900 hover:underline">
            All Articles & Filters →
          </Link>
        </div>

        {newsDown ? (
          <Unavailable what="News and sentiment" reason={news.reason} />
        ) : articles.length === 0 ? (
          <EmptyState
            title="No relevant news found"
            action={<Link to={`/news/${sym}`} className="btn mt-3">Widen the date range</Link>}
          >
            No articles about {d.profile.name} were found in the last 14 days. Smaller companies are often not covered by free news feeds. Price and trend data above are unaffected.
          </EmptyState>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.slice(0, 6).map((a) => (
              <ArticleCard key={a.url || a.title} article={a} />
            ))}
          </div>
        )}
      </div>

      <Disclaimer>
        The FinSight Chronicle is an educational NLP intelligence project. Sentiment scores and trend forecasts are experimental models and are not financial advice.
      </Disclaimer>
    </div>
  );
}
