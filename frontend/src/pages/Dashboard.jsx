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

function Home({ onPick }) {
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <section className="rounded-lg border border-stone-200 bg-stone-50 p-6 sm:p-10">
        <span className="broadsheet-kicker">Financial news and stock analysis</span>
        <h2 className="mt-2 max-w-3xl font-serif text-3xl font-black leading-tight tracking-tight text-stone-950 sm:text-5xl">
          Understand what is moving a company’s story.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-700 sm:text-base">
          Explore company news, sentiment, stock performance, and an experimental five-session trend forecast.
          Search by company name or ticker using the search box above.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/about" className="btn btn-primary">
            How FinSight works <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <span className="self-center text-xs text-stone-500">Or choose a popular company below.</span>
        </div>
      </section>

      <section aria-labelledby="popular-companies-heading">
        <div className="mb-4">
          <h3 id="popular-companies-heading" className="font-serif text-xl font-bold text-stone-950">
            Choose a company to get started
          </h3>
          <p className="mt-1 text-sm text-stone-600">Select a company to open its dashboard.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {POPULAR_LIST.map((item) => (
            <button
              key={item.sym}
              type="button"
              className="group flex min-h-24 items-center justify-between rounded-md border border-stone-200 bg-white p-4 text-left transition hover:border-stone-900 hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
              onClick={() => onPick(item.sym)}
            >
              <span>
                <span className="block font-serif font-bold text-stone-950 group-hover:underline">{item.name}</span>
                <span className="mt-1 block text-xs text-stone-500">{item.sym} · {item.ex}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-stone-400 transition group-hover:translate-x-1 group-hover:text-stone-900" aria-hidden />
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="overview-heading">
        <div className="mb-4">
          <h3 id="overview-heading" className="font-serif text-xl font-bold text-stone-950">What you can explore</h3>
          <p className="mt-1 text-sm text-stone-600">Each company dashboard brings its key information together.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-md border border-stone-200 p-5">
            <h4 className="font-serif font-bold text-stone-900">News & sentiment</h4>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Review analyzed headlines, summaries, sentiment, and key financial topics.
            </p>
          </article>
          <article className="rounded-md border border-stone-200 p-5">
            <h4 className="font-serif font-bold text-stone-900">Price & performance</h4>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Explore recent prices, historical charts, trading volume, and market indicators.
            </p>
          </article>
          <article className="rounded-md border border-stone-200 p-5">
            <h4 className="font-serif font-bold text-stone-900">Trend forecast</h4>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              See an experimental five-session forecast alongside model evaluation and a baseline comparison.
            </p>
          </article>
        </div>
      </section>

      <p className="border-t border-stone-200 pt-4 text-xs leading-relaxed text-stone-500">
        Forecasts are experimental and for educational use only—not financial advice. Short-term market movements are uncertain.
        <Link to="/about" className="ml-1 font-semibold text-stone-800 underline underline-offset-2 hover:text-black">
          Read about the methodology and limitations.
        </Link>
      </p>
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

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="space-y-6 lg:col-span-8">
          <h2 className="border-b border-stone-200 pb-2 font-serif text-xl font-bold text-stone-900">
            Stock performance and forecast
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

        <div className="space-y-4 lg:col-span-4">
          <h2 className="border-b border-stone-200 pb-2 font-serif text-xl font-bold text-stone-900">
            News overview
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
