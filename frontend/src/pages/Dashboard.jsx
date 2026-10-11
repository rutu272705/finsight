import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, RefreshCw, Star, ChevronDown } from "lucide-react";
import { api } from "../api.js";
import { useApi } from "../hooks/useApi.js";
import { changeColor, dateTime, money, pct } from "../format.js";
import { Card, DashboardSkeleton, EmptyState, ErrorState, Unavailable, Disclaimer } from "../components/ui.jsx";
import PriceChart from "../components/PriceChart.jsx";
import PredictionCard from "../components/PredictionCard.jsx";
import { SentimentDonut, SentimentSummary } from "../components/SentimentPanels.jsx";
import TopicBars from "../components/TopicBars.jsx";
import ArticleCard from "../components/ArticleCard.jsx";

const POPULAR = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "AAPL", "TSLA", "NVDA"];

function Home({ onPick }) {
  const { data: recent } = useApi((s) => api.history(s), []);
  return (
    <div className="mx-auto max-w-3xl py-12 sm:py-20">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 sm:p-12 shadow-sm text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          NLP Financial Intelligence
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Read the news the way the market does.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-600 leading-relaxed">
          Search any company or ticker to analyse sentiment, extract financial figures and entities, and forecast the next trading sessions with machine learning.
        </p>
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Popular companies</p>
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR.map((s) => (
              <button
                key={s}
                className="btn hover:border-slate-400 font-semibold text-slate-800"
                onClick={() => onPick(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {recent?.length > 0 && (
          <div className="mt-10 border-t border-slate-100 pt-8 text-left">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Recently searched</p>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50">
              {recent.map((r) => (
                <button
                  key={r.symbol}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-white"
                  onClick={() => onPick(r.symbol)}
                >
                  <span className="truncate font-medium text-slate-800">{r.name || r.symbol}</span>
                  <span className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-slate-700 shadow-xs">
                    {r.symbol}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyHeader({ d, onRefresh, refreshing, refreshError, watching, onToggleWatch, watchBusy }) {
  const { profile, quote, symbol } = d;
  const [showExport, setShowExport] = useState(false);

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-2xl font-bold text-slate-900 sm:text-3xl">{profile.name}</h1>
            <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800">
              {symbol}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {profile.exchange ? `${profile.exchange}` : ""}
            {profile.currency ? ` · Currency in ${profile.currency}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" aria-label="Latest price">
            {money(quote.price, profile.currency)}
          </p>
          <p className={`mt-1 text-sm font-semibold ${changeColor(quote.change)}`}>
            {quote.change > 0 ? "+" : ""}
            {quote.change.toFixed(2)} ({pct(quote.change_pct)}){" "}
            <span className="font-normal text-slate-400">on {quote.as_of}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <p>
          Last updated {dateTime(d.last_updated)}
          {d.demo && " · synthetic demo data"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`btn transition-colors ${watching ? "border-amber-200 bg-amber-50 text-amber-900 font-semibold" : ""}`}
            onClick={onToggleWatch}
            disabled={watchBusy}
            aria-pressed={watching}
          >
            <Star className={`h-4 w-4 ${watching ? "fill-amber-400 text-amber-500" : "text-slate-400"}`} aria-hidden />{" "}
            {watching ? "On watchlist" : "Add to watchlist"}
          </button>

          <div className="relative">
            <div className="flex items-center">
              <a className="btn rounded-r-none border-r-0" href={api.exportUrl(symbol, "articles")}>
                <Download className="h-4 w-4 text-slate-500" aria-hidden /> Export CSV
              </a>
              <button
                type="button"
                onClick={() => setShowExport(!showExport)}
                className="btn !px-2 rounded-l-none"
                aria-label="More export formats"
              >
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </div>
            {showExport && (
              <div
                className="absolute right-0 z-30 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                onMouseLeave={() => setShowExport(false)}
              >
                <a
                  href={api.exportUrl(symbol, "articles")}
                  className="block px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowExport(false)}
                >
                  Articles analysis CSV
                </a>
                <a
                  href={api.exportUrl(symbol, "prices")}
                  className="block px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowExport(false)}
                >
                  1-Year Prices CSV
                </a>
                <a
                  href={api.exportUrl(symbol, "predictions")}
                  className="block px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowExport(false)}
                >
                  Prediction history CSV
                </a>
              </div>
            )}
          </div>

          <button className="btn" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 text-slate-500 ${refreshing ? "animate-spin" : ""}`} aria-hidden /> Refresh data
          </button>
        </div>
        {refreshError && <p role="alert" className="w-full text-xs font-medium text-amber-700">{refreshError}</p>}
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
    document.title = sym ? `${sym} · FinSight` : "FinSight";
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
    <div className="space-y-5">
      <CompanyHeader
        d={d}
        onRefresh={refresh}
        refreshing={refreshing}
        refreshError={refreshError}
        watching={isWatching}
        onToggleWatch={toggleWatch}
        watchBusy={watchBusy}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Price history" subtitle="Daily closing price" className="lg:col-span-2">
          <PriceChart
            history={d.history}
            sentimentDaily={d.sentiment_daily}
            period={period}
            onPeriod={setPeriod}
            currency={d.profile.currency}
          />
        </Card>
        <Card title="Predicted trend" subtitle="Experimental, short-term">
          <PredictionCard prediction={d.prediction} symbol={sym} />
        </Card>
      </div>

      {newsDown ? (
        <Unavailable what="News and sentiment" reason={news.reason} />
      ) : articles.length === 0 ? (
        <EmptyState title="No relevant news found" action={<Link to={`/news/${sym}`} className="btn mt-3">Widen the date range</Link>}>
          No articles about {d.profile.name} were found in the last 14 days. Smaller companies are often not covered by free news feeds. Price and trend data above are unaffected.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Card title="Sentiment score">
              <SentimentSummary aggregate={news.aggregate} />
            </Card>
            <Card title="Sentiment mix" subtitle={`${news.aggregate.n_articles} articles analysed`}>
              <SentimentDonut distribution={news.aggregate.distribution} />
            </Card>
            <Card title="Key financial topics" subtitle="Most frequent across headlines">
              <TopicBars items={news.topics.topics.slice(0, 6)} />
            </Card>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <Card
              title="Recent headlines"
              className="lg:col-span-2"
              action={
                <Link to={`/news/${sym}`} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                  All articles and filters →
                </Link>
              }
            >
              <div className="space-y-3">
                {articles.slice(0, 6).map((a) => (
                  <ArticleCard key={a.url || a.title} article={a} compact />
                ))}
              </div>
            </Card>
            <div className="space-y-5">
              <Card title="Frequently mentioned" subtitle="Organisations in the news">
                <TopicBars items={news.topics.companies.slice(0, 6)} color="#16A34A" emptyText="No organisations recognised." />
              </Card>
              <Card title="People" subtitle="Named in coverage">
                <TopicBars items={news.topics.people.slice(0, 5)} color="#0284C7" emptyText="No people recognised." />
              </Card>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            News via {news.providers_used.join(", ")}. {news.warnings.length > 0 && `Note: ${news.warnings.join(" ")}`}
          </p>
        </>
      )}
      <Disclaimer>FinSight is an educational project. Sentiment scores and trend forecasts are experimental and are not investment advice.</Disclaimer>
    </div>
  );
}
