import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Download, RefreshCw, Sparkles, Send } from "lucide-react";
import { api } from "../api.js";
import { useApi } from "../hooks/useApi.js";
import { Card, EmptyState, ErrorState, Spinner, SentimentBadge } from "../components/ui.jsx";
import ArticleCard from "../components/ArticleCard.jsx";
import FilterBar from "../components/FilterBar.jsx";
import EntityTags from "../components/EntityTags.jsx";
import { SentimentSummary, SentimentDonut } from "../components/SentimentPanels.jsx";
import { signed } from "../format.js";

const BLANK = { sentiment: "", source: "", from: "", to: "", days: "14" };
const POPULAR = ["AAPL", "TSLA", "NVDA", "RELIANCE.NS", "TCS.NS", "INFY.NS"];

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
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Custom Text & News NLP Analyzer</h3>
            <p className="text-xs text-slate-500">Test FinSight's sentiment and entity extraction on your own financial headline or text.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="btn text-xs font-semibold"
        >
          {open ? "Hide tool" : "Open analyzer"}
        </button>
      </div>

      {open && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <form onSubmit={handleAnalyze} className="space-y-3">
            <div>
              <label htmlFor="custom-headline" className="block text-xs font-semibold text-slate-700">Headline or Statement *</label>
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
              <label htmlFor="custom-description" className="block text-xs font-semibold text-slate-700">Additional Text or Snippet (Optional)</label>
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
                <Send className="h-3.5 w-3.5" aria-hidden />
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

          {analysisError && <p className="mt-3 text-xs text-rose-600 font-medium">{analysisError}</p>}

          {analysisResult && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Analysis Result</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">Score: <strong>{signed(analysisResult.sentiment?.score)}</strong></span>
                  <SentimentBadge label={analysisResult.sentiment?.label} />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-900">{analysisResult.title}</p>
              {analysisResult.summary && (
                <p className="text-xs text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                  <strong className="text-slate-800">Summary: </strong>{analysisResult.summary}
                </p>
              )}
              {analysisResult.explanation?.signals?.length > 0 && (
                <div className="text-xs">
                  <span className="font-semibold text-slate-700">Key signals identified: </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {analysisResult.explanation.signals.map((s, i) => (
                      <span
                        key={i}
                        className={`chip font-medium ${
                          s.polarity === "positive"
                            ? "!border-emerald-200 !bg-emerald-50 !text-emerald-800"
                            : "!border-rose-200 !bg-rose-50 !text-rose-800"
                        }`}
                      >
                        {s.term} {s.delta !== undefined && `(${signed(s.delta)})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <EntityTags entities={analysisResult.entities} />
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
      <div className="space-y-6">
        <EmptyState title="Pick a company first">
          Use the search bar above to choose a company, then its news appears here with filters for date, source and sentiment.
          <div className="mt-5 border-t border-slate-200 pt-4">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Or pick a popular company to start</p>
            <div className="flex flex-wrap justify-center gap-2">
              {POPULAR.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="btn font-semibold text-slate-800"
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{view?.profile?.name || sym} news</h1>
            <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800">{sym}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Every article is classified for sentiment, summarised and scanned for entities.</p>
        </div>
        <div className="flex gap-2">
          <a className="btn" href={api.exportUrl(sym, "articles")}>
            <Download className="h-4 w-4 text-slate-500" aria-hidden /> Export CSV
          </a>
          <button className="btn" onClick={refresh} disabled={refreshing || loading}>
            <RefreshCw className={`h-4 w-4 text-slate-500 ${refreshing ? "animate-spin" : ""}`} aria-hidden /> Refresh
          </button>
        </div>
      </div>
      {refreshMsg && <p role="alert" className="text-sm font-medium text-amber-700">{refreshMsg}</p>}

      <CustomAnalyzer defaultSymbol={sym} />

      <FilterBar filters={filters} onChange={onFilters} sources={view?.sources || []} disabled={loading && !view} />

      {loading && !view && <Spinner label="Fetching and analysing news" />}
      {error && <ErrorState error={error} onRetry={reload} title="News is unavailable" />}
      {view && !error && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-3.5 lg:col-span-2" aria-busy={loading}>
            <p className="text-xs font-medium text-slate-500" aria-live="polite">
              Showing {view.articles.length} of {view.total_before_filters} articles
              {view.providers_used?.length ? ` · via ${view.providers_used.join(", ")}` : ""}
            </p>
            {meta?.warnings?.length > 0 && <p className="text-xs font-medium text-amber-700">{meta.warnings.join(" ")}</p>}
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
              view.articles.map((a) => <ArticleCard key={a.url || a.title} article={a} />)
            )}
          </div>
          <div className="space-y-5">
            {view.aggregate.n_articles > 0 && (
              <>
                <Card title="Sentiment score">
                  <SentimentSummary aggregate={view.aggregate} />
                </Card>
                <Card title="Sentiment mix">
                  <SentimentDonut distribution={view.aggregate.distribution} />
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
