import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, Trash2, Plus } from "lucide-react";
import { api } from "../api.js";
import { useApi } from "../hooks/useApi.js";
import { changeColor, money, pct } from "../format.js";
import { Card, EmptyState, ErrorState, Spinner } from "../components/ui.jsx";
import SearchBar from "../components/SearchBar.jsx";

export default function Watchlist() {
  const wl = useApi((s) => api.watchlist(s), []);
  const hist = useApi((s) => api.history(s), []);
  const [msg, setMsg] = useState("");
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

  const handleAddCompany = async (sym) => {
    if (!sym) return;
    setAdding(true);
    setMsg("");
    try {
      await api.addWatch(sym);
      wl.reload();
    } catch (e) {
      setMsg(e.message || "Failed to add company to watchlist.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Broadsheet Section Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-black pb-4">
        <div>
          <span className="broadsheet-kicker">Personal Market Ledger · Tracked Equities</span>
          <h1 className="font-serif font-black text-3xl sm:text-4xl text-stone-950 mt-1">
            Watchlist
          </h1>
          <p className="text-xs text-stone-500 font-serif italic mt-0.5">
            Monitor selected equities, track latest closing levels, and export sentiment records.
          </p>
        </div>

        {/* Quick Add Form */}
        <div className="flex w-full items-center gap-2 md:w-80">
          <Plus className="h-4 w-4 shrink-0 text-stone-500" aria-hidden />
          <SearchBar
            onSelect={handleAddCompany}
            placeholder="Add by company name or ticker"
            label="Add a company to your watchlist"
          />
          {adding && <span role="status" className="shrink-0 text-xs text-stone-500">Adding...</span>}
        </div>
      </div>

      {msg && <p role="alert" className="text-xs font-serif font-bold text-amber-800">{msg}</p>}

      {/* Saved Companies Broadsheet Table */}
      <div className="border border-stone-200 p-5 bg-white">
        <h3 className="font-serif font-bold text-lg text-stone-900 border-b border-black pb-2 mb-4">
          Saved Companies & Current Close
        </h3>

        {wl.loading && <Spinner label="Loading portfolio watchlist ledger" />}
        {wl.error && <ErrorState error={wl.error} onRetry={wl.reload} />}

        {wl.data && wl.data.length === 0 && (
          <EmptyState title="Your watchlist is empty">
            Open any company's dashboard and choose “Add to watchlist” to track it here, or search by company name above.
          </EmptyState>
        )}

        {wl.data?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-serif">
              <thead className="border-b border-black font-sans font-bold uppercase text-[10px] text-stone-600">
                <tr>
                  <th className="py-2.5">Corporation</th>
                  <th>Ticker</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Session Change</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {wl.data.map((w) => (
                  <tr key={w.symbol} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5">
                      <Link to={`/stock/${w.symbol}`} className="font-bold text-stone-950 hover:underline">
                        {w.name}
                      </Link>
                    </td>
                    <td>
                      <span className="font-sans font-bold text-xs bg-stone-100 px-1.5 py-0.5 border border-stone-200 text-stone-800">
                        {w.symbol}
                      </span>
                      {w.exchange ? <span className="ml-1 text-xs text-stone-500 font-sans">({w.exchange})</span> : ""}
                    </td>
                    <td className="text-right font-sans font-bold text-stone-900">
                      {w.quote ? money(w.quote.price) : <span className="text-xs text-amber-800">Price unavailable</span>}
                    </td>
                    <td className="text-right font-sans font-bold">
                      {w.quote ? (
                        <span className={changeColor(w.quote.change)}>{pct(w.quote.change_pct)}</span>
                      ) : (
                        <span className="text-xs text-stone-400">—</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1 font-sans">
                        <a
                          className="btn !px-2 !py-1 text-stone-700 hover:text-black"
                          href={api.exportUrl(w.symbol, "articles")}
                          aria-label={`Export ${w.symbol} articles as CSV`}
                          title="Export analysed articles as CSV"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        <button
                          className="btn !px-2 !py-1 text-stone-400 hover:text-rose-700 hover:border-rose-400"
                          onClick={() => remove(w.symbol)}
                          aria-label={`Remove ${w.symbol} from watchlist`}
                          title="Remove from watchlist"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recently Searched Ledger */}
      <div className="border border-stone-200 p-5 bg-white">
        <div className="flex items-baseline justify-between border-b border-stone-200 pb-2 mb-4">
          <h3 className="font-serif font-bold text-base text-stone-900">
            Recently Searched Companies
          </h3>
          {hist.data?.length > 0 && (
            <button
              className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 hover:text-black hover:underline"
              onClick={clear}
            >
              Clear history
            </button>
          )}
        </div>

        {hist.data?.length === 0 && <p className="text-xs text-stone-400 font-serif italic">Companies you open will appear here.</p>}
        <div className="flex flex-wrap gap-2">
          {hist.data?.map((h) => (
            <Link key={h.symbol} className="btn" to={`/stock/${h.symbol}`}>
              {h.symbol}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
