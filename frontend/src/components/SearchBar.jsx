import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { api } from "../api.js";

/** Search by company name or ticker. Falls back to treating the text as a ticker when no match is picked. */
export default function SearchBar({ onSelect, placeholder = "Search company or ticker (e.g. AAPL, TCS.NS)" }) {
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [warn, setWarn] = useState("");
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const q = text.trim();
    if (q.length < 1) {
      setResults([]);
      setWarn("");
      return undefined;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      api
        .search(q, ctrl.signal)
        .then((r) => {
          setResults(r.data);
          setWarn(r.warnings?.[0] || "");
          setOpen(true);
        })
        .catch((e) => e.name !== "AbortError" && setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [text]);

  useEffect(() => {
    const close = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const choose = (sym) => {
    setOpen(false);
    setText("");
    onSelect(sym.toUpperCase());
  };
  const submit = (e) => {
    e.preventDefault();
    const q = text.trim();
    if (!q) return;
    // exact-looking ticker goes straight through; otherwise use the best match
    if (/^[A-Za-z0-9.\-^=]{1,20}$/.test(q) && (!results.length || results.some((r) => r.symbol === q.toUpperCase()))) {
      choose(q);
    } else if (results[0]) {
      choose(results[0].symbol);
    } else {
      choose(q);
    }
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={submit} role="search" className="relative">
        <label htmlFor="company-search" className="sr-only">Search for a company by name or ticker</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          id="company-search"
          className="input pl-9"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
        />
      </form>
      {open && (results.length > 0 || warn) && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {warn && <p className="border-b border-slate-100 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-800">{warn}</p>}
          <ul role="listbox" className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {results.map((r) => (
              <li key={r.symbol}>
                <button
                  type="button"
                  role="option"
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-slate-50"
                  onClick={() => choose(r.symbol)}
                >
                  <span className="min-w-0 truncate font-medium text-slate-800">{r.name}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    <span className="font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{r.symbol}</span>
                    {r.exchange ? ` · ${r.exchange}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {loading && <span className="sr-only">Searching</span>}
    </div>
  );
}
