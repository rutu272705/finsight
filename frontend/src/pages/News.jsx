import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Download, RefreshCw, Sparkles, Send } from "lucide-react";
import { api } from "../api.js";
import { useApi } from "../hooks/useApi.js";
import { Card, EmptyState, ErrorState, Spinner, SentimentBadge } from "../components/ui.jsx";
import ArticleCard from "../components/ArticleCard.jsx";
import FilterBar from "../components/FilterBar.jsx";
import EntityTags from "../components/EntityTags.jsx";
import { SentimentSummary } from "../components/SentimentPanels.jsx";
import SentimentDonut from "../components/SentimentDonut.jsx";

const BLANK = { sentiment: "", source: "", from: "", to: "", days: "14" };
const POPULAR = ["AAPL", "TSLA", "NVDA", "RELIANCE.NS", "TCS.NS", "INFY.NS"];

function plainLanguageConclusion(article) {
  const signals = article.explanation?.signals || [];
  const positive = signals.filter((signal) => signal.polarity === "positive").map((signal) => signal.term);
  const negative = signals.filter((signal) => signal.polarity === "negative").map((signal) => signal.term);
  const label = article.sentiment?.label;
  const examples = (terms) => terms.slice(0, 2).map((term) => `“${term}”`).join(" and ");

  if (positive.length && negative.length) {
    return `The wording is mixed. ${examples(positive)} sounds positive, while ${examples(negative)} sounds negative. FinSight labels the overall tone ${label || "mixed"}, but the positive wording does not erase the negative part of the story. Read the full report before drawing a conclusion.`;
  }

  if (positive.length) {
    return `The wording leans positive. FinSight noticed ${examples(positive)}. That may sound encouraging, but it does not prove the company is doing well or mean its stock will rise.`;
  }

  if (negative.length) {
    return `The wording leans negative. FinSight noticed ${examples(negative)}. That may sound concerning, but it does not prove the company is doing badly or mean its stock will fall.`;
  }

  return `FinSight labels the wording ${label || "unclear"}, but it did not find clear positive or negative word clues. The result may miss context, so read the full story before drawing a conclusion.`;
}

function CustomAnalyzer({ defaultSymbol = "" }) {
  const [open, setOpen] = useState(false);
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState("");

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!headline.trim()) return;
    setAnalyzing(true);
    setAnalysisError("");
    setAnalysisResult(null);
    try {
      const res = await api.analyze({
        symbol: defaultSymbol || "CUSTOM",
        articles: [
          {
            title: headline.trim(),
            description: description.trim(),
            source: "Manual Input",
          },
        ],
      });
      setAnalysisResult(res.data?.articles?.[0] || null);
    } catch (err) {
      setAnalysisError(err.message || "Failed to analyze text.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="border border-stone-900 bg-stone-50/50 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-stone-900" aria-hidden />
          <div>
            <h3 className="font-serif font-bold text-base text-stone-900">Custom Text & News NLP Analyzer</h3>
            <p className="text-xs text-stone-600 font-serif italic">Test FinSight's sentiment and entity extraction on your own financial statement or headline.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="btn"
        >
          {open ? "Hide tool" : "Open analyzer"}
        </button>
      </div>

      {open && (
        <div className="mt-4 border-t border-stone-200 pt-4">
          <form onSubmit={handleAnalyze} className="space-y-3">
            <div>
              <label htmlFor="custom-headline" className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                Headline or Corporate Statement *
              </label>
              <input
                id="custom-headline"
                type="text"
                className="input mt-1"
                placeholder="e.g. Company reports 24% increase in net revenue and announces higher quarterly dividend"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="custom-description" className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                Additional Text or Article Paragraph (Optional)
              </label>
              <textarea
                id="custom-description"
                rows={2}
                className="input mt-1 resize-y"
                placeholder="Optional paragraph context, financial metrics, or excerpt..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={analyzing || !headline.trim()}
                className="btn btn-primary"
              >
                <Send className="h-3 w-3" aria-hidden />
                {analyzing ? "Analyzing..." : "Analyze with FinSight NLP"}
              </button>
              {headline && (
                <button
                  type="button"
                  onClick={() => { setHeadline(""); setDescription(""); setAnalysisResult(null); }}
                  className="btn"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          {analysisError && <p className="mt-3 text-xs text-rose-800 font-serif font-bold">{analysisError}</p>}

          {analysisResult && (
            <div className="mt-4 border border-stone-300 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2">
                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-stone-500">What FinSight thinks</span>
                <SentimentBadge label={analysisResult.sentiment?.label} />
              </div>
              <section aria-label="A simple takeaway" className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <h4 className="text-xs font-bold text-stone-900">A simple takeaway</h4>
                <p className="mt-1 text-sm leading-relaxed text-stone-800">{plainLanguageConclusion(analysisResult)}</p>
              </section>
              {analysisResult.summary && analysisResult.summary.trim() !== analysisResult.title?.trim() && (
                <p className="border border-stone-200 bg-stone-50 p-2.5 text-xs leading-relaxed text-stone-700">
                  <strong className="text-stone-900">Short version: </strong>{analysisResult.summary}
                </p>
              )}
              {analysisResult.explanation?.signals?.length > 0 && (
                <div className="text-xs">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-stone-600">Words FinSight noticed</span>
                  <div className="mt-1 flex flex-wrap gap-1.5 font-sans">
                    {analysisResult.explanation.signals.map((s, i) => (
                      <span
                        key={i}
                        className={`chip text-[10px] font-bold ${
                          s.polarity === "positive"
                            ? "!border-emerald-700 !bg-emerald-50 !text-emerald-900"
                            : s.polarity === "negative"
                              ? "!border-rose-700 !bg-rose-50 !text-rose-900"
                              : "!border-stone-400 !bg-stone-100 !text-stone-800"
                        }`}
                      >
                        “{s.term}” · {s.polarity === "positive" ? "positive wording" : s.polarity === "negative" ? "negative wording" : "neutral wording"}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 leading-relaxed text-stone-600">
                    These are clues FinSight noticed in the wording, not proof that the events happened.
                  </p>
                </div>
              )}
              {analysisResult.entities && (
                <div className="border-t border-stone-200 pt-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-600">Names and details found in the text</p>
                  <EntityTags entities={analysisResult.entities} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function News() {
  const navigate = useNavigate();
  const { symbol } = useParams();
  const sym = symbol ? decodeURIComponent(symbol).toUpperCase() : null;
  const [filters, setFilters] = useState(BLANK);
  const [refreshMsg, setRefreshMsg] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [override, setOverride] = useState(null);

  const params = { ...filters };
  const { data, meta, error, loading, reload } = useApi(
    (signal) => (sym ? api.news(sym, params, signal) : null),
    [sym, filters.sentiment, filters.source, filters.from, filters.to, filters.days],
  );

  if (!sym) {
    return (
      <div className="space-y-8">
        <EmptyState title="Pick a company first">
          Use the search bar above to choose a company, then its news appears here with filters for date, source and sentiment.
          <div className="mt-6 border-t border-stone-200 pt-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">
              Select an active corporation to load dispatches
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {POPULAR.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="btn"
                  onClick={() => navigate(`/news/${s}`)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </EmptyState>
        <CustomAnalyzer />
      </div>
    );
  }

  const view = override || data;
  const refresh = async () => {
    setRefreshing(true);
    setRefreshMsg("");
    try {
      const r = await api.news(sym, { ...params, refresh: true });
      setOverride(r.data);
    } catch (e) {
      setRefreshMsg(e.message);
    } finally {
      setRefreshing(false);
    }
  };
  const onFilters = (f) => {
    setOverride(null);
    setFilters(f);
  };

  return (
    <div className="space-y-6">
      {/* Broadsheet Section Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-black pb-4">
        <div>
          <span className="broadsheet-kicker">Financial News Wire · Corporate Intelligence</span>
          <h1 className="font-serif font-black text-3xl sm:text-4xl text-stone-950 mt-1">
            {view?.profile?.name || sym} News
          </h1>
          <p className="text-xs text-stone-500 font-serif italic mt-0.5">
            Every published dispatch is scored for sentiment, summarised, and scanned for entities.
          </p>
        </div>
        <div className="flex gap-2">
          <a className="btn" href={api.exportUrl(sym, "articles")}>
            <Download className="h-3.5 w-3.5" aria-hidden /> Export CSV
          </a>
          <button className="btn" onClick={refresh} disabled={refreshing || loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden /> Refresh
          </button>
        </div>
      </div>

      {refreshMsg && <p role="alert" className="text-xs font-serif font-bold text-amber-800">{refreshMsg}</p>}

      {view && !error && view.articles.length > 0 && (
        <section aria-labelledby="featured-stories-heading" className="border-t-2 border-black pt-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-stone-200 pb-2">
            <h2 id="featured-stories-heading" className="font-serif text-2xl font-black italic text-stone-950 sm:text-3xl">
              Featured Stories &amp; Corporate News Coverage
            </h2>
            <a href="#all-articles" className="text-xs font-bold uppercase tracking-wider text-stone-900 hover:underline">
              All articles &amp; filters ↓
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {view.articles.slice(0, 3).map((a) => (
              <ArticleCard key={a.url || a.title} article={a} />
            ))}
          </div>
        </section>
      )}

      {/* NLP Custom Headline Analyzer Tool */}
      <CustomAnalyzer defaultSymbol={sym} />

      <section id="all-articles" aria-labelledby="all-articles-heading" className="scroll-mt-36 space-y-4">
        <div>
          <h2 id="all-articles-heading" className="font-serif text-xl font-bold text-stone-950">
            All articles &amp; filters
          </h2>
          <p className="mt-1 text-xs text-stone-600">Narrow coverage by sentiment, source, date, or look-back period.</p>
        </div>
        <FilterBar filters={filters} onChange={onFilters} sources={view?.sources || []} disabled={loading && !view} />

        {loading && !view && <Spinner label="Fetching and analysing news dispatches" />}
        {error && <ErrorState error={error} onRetry={reload} title="News is unavailable" />}

        {view && !error && (
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Main Column: Article Listings in Broadsheet Layout */}
            <div className="space-y-4 lg:col-span-8 lg:border-r lg:border-stone-200 lg:pr-8" aria-busy={loading}>
              <div className="flex items-center justify-between border-b border-stone-200 pb-2 text-xs font-serif">
                <span className="text-stone-600" aria-live="polite">
                  Showing <strong>{view.articles.length}</strong> of {view.total_before_filters} articles
                  {view.providers_used?.length ? ` · via ${view.providers_used.join(", ")}` : ""}
                </span>
                {meta?.warnings?.length > 0 && <span className="text-xs font-bold text-amber-800">{meta.warnings.join(" ")}</span>}
              </div>

              {view.articles.length === 0 ? (
                <EmptyState
                  title={view.total_before_filters ? "No articles match these filters" : "No relevant articles found"}
                  action={view.total_before_filters ? <button className="btn mt-3" onClick={() => onFilters(BLANK)}>Clear filters</button> : null}
                >
                  {view.total_before_filters
                    ? "Loosen the sentiment, source or date filters to see more."
                    : "No coverage was found for this company in the selected window. Try a longer look-back period or a larger company."}
                </EmptyState>
              ) : (
                <div className="space-y-4">
                  {view.articles.map((a) => (
                    <ArticleCard key={a.url || a.title} article={a} />
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Sentiment Score & Donut */}
            <div className="space-y-6 lg:col-span-4">
              {view.aggregate.n_articles > 0 && (
                <>
                  <div className="border border-stone-200 p-4">
                    <h3 className="font-serif font-bold text-sm text-stone-900 mb-2 border-b border-stone-100 pb-1">
                      Editorial Sentiment Score
                    </h3>
                    <SentimentSummary aggregate={view.aggregate} />
                  </div>

                  <div className="border border-stone-200 p-4">
                    <h3 className="font-serif font-bold text-sm text-stone-900 mb-2 border-b border-stone-100 pb-1">
                      Sentiment Breakdown
                    </h3>
                    <SentimentDonut distribution={view.aggregate.distribution} />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
