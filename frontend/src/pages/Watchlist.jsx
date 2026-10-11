import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, Trash2, Plus } from "lucide-react";
import { api } from "../api.js";
import { useApi } from "../hooks/useApi.js";
import { changeColor, money, pct } from "../format.js";
import { Card, EmptyState, ErrorState, Spinner } from "../components/ui.jsx";

export default function Watchlist() {
  const wl = useApi((s) => api.watchlist(s), []);
  const hist = useApi((s) => api.history(s), []);
  const [msg, setMsg] = useState("");
  const [tickerInput, setTickerInput] = useState("");
  const [adding, setAdding] = useState(false);

  const remove = async (sym) => {
    try {
      await api.removeWatch(sym);
      wl.reload();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const clear = async () => {
    try {
      await api.clearHistory();
      hist.reload();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const handleAddTicker = async (e) => {
    e.preventDefault();
    const sym = tickerInput.trim().toUpperCase();
    if (!sym) return;
    setAdding(true);
    setMsg("");
    try {
      await api.addWatch(sym);
      setTickerInput("");
      wl.reload();
    } catch (e) {
      setMsg(e.message || "Failed to add ticker to watchlist.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Watchlist</h1>
          <p className="mt-1 text-sm text-slate-500">Track and monitor your selected stocks and quick-export their data.</p>
        </div>
        <form onSubmit={handleAddTicker} className="flex items-center gap-2">
          <input
            type="text"
            className="input !py-1.5 w-44 text-xs uppercase"
            placeholder="Add ticker (e.g. AAPL)"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={adding || !tickerInput.trim()}
            className="btn btn-primary !py-1.5 !px-3 text-xs"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add
          </button>
        </form>
      </div>

      {msg && <p role="alert" className="text-sm font-medium text-amber-700">{msg}</p>}

      <Card title="Saved companies" subtitle="Latest close and daily change">
        {wl.loading && <Spinner label="Loading watchlist" />}
        {wl.error && <ErrorState error={wl.error} onRetry={wl.reload} />}
        {wl.data && wl.data.length === 0 && (
          <EmptyState title="Your watchlist is empty">
            Open any company's dashboard and choose “Add to watchlist” to track it here, or use the quick-add input above.
          </EmptyState>
        )}
        {wl.data?.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {wl.data.map((w) => (
              <li key={w.symbol} className="flex flex-wrap items-center gap-3 py-3.5 transition-colors hover:bg-slate-50/50 px-2 rounded-lg">
                <Link to={`/stock/${w.symbol}`} className="min-w-0 flex-1 hover:text-blue-600">
                  <p className="truncate text-sm font-semibold text-slate-900">{w.name}</p>
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{w.symbol}</span>
                    {w.exchange ? ` · ${w.exchange}` : ""}
                  </p>
                </Link>
                {w.quote ? (
                  <div className="text-right text-sm">
                    <p className="font-semibold text-slate-900">{money(w.quote.price)}</p>
                    <p className={`text-xs font-medium ${changeColor(w.quote.change)}`}>{pct(w.quote.change_pct)}</p>
                  </div>
                ) : (
                  <p className="text-xs font-medium text-amber-700">Price unavailable</p>
                )}
                <div className="flex items-center gap-1.5">
                  <a
                    className="btn !px-2.5 !py-1.5 text-slate-600 hover:text-slate-900"
                    href={api.exportUrl(w.symbol, "articles")}
                    aria-label={`Export ${w.symbol} articles as CSV`}
                    title="Export analysed articles"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    className="btn !px-2.5 !py-1.5 text-slate-400 hover:text-rose-600 hover:border-rose-300"
                    onClick={() => remove(w.symbol)}
                    aria-label={`Remove ${w.symbol} from watchlist`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Recently searched"
        action={
          hist.data?.length > 0 && (
            <button className="text-xs font-medium text-slate-500 hover:text-slate-900" onClick={clear}>
              Clear history
            </button>
          )
        }
      >
        {hist.data?.length === 0 && <p className="text-sm text-slate-400">Companies you open will appear here.</p>}
        <div className="flex flex-wrap gap-2">
          {hist.data?.map((h) => (
            <Link key={h.symbol} className="btn font-semibold text-slate-800" to={`/stock/${h.symbol}`}>
              {h.symbol}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
