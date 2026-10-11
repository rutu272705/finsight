export default function FilterBar({ filters, onChange, sources = [], disabled }) {
  const set = (k, v) => onChange({ ...filters, [k]: v });
  const reset = () => onChange({ sentiment: "", source: "", from: "", to: "", days: filters.days });
  const active = filters.sentiment || filters.source || filters.from || filters.to;
  return (
    <div className="panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5" role="search" aria-label="Filter news">
      <label className="text-xs font-medium text-slate-600">Sentiment
        <select className="input mt-1.5" value={filters.sentiment} onChange={(e) => set("sentiment", e.target.value)} disabled={disabled}>
          <option value="">All sentiments</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
      </label>
      <label className="text-xs font-medium text-slate-600">Source
        <select className="input mt-1.5" value={filters.source} onChange={(e) => set("source", e.target.value)} disabled={disabled}>
          <option value="">All sources</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <label className="text-xs font-medium text-slate-600">From
        <input type="date" className="input mt-1.5" value={filters.from} max={filters.to || undefined} onChange={(e) => set("from", e.target.value)} disabled={disabled} />
      </label>
      <label className="text-xs font-medium text-slate-600">To
        <input type="date" className="input mt-1.5" value={filters.to} min={filters.from || undefined} onChange={(e) => set("to", e.target.value)} disabled={disabled} />
      </label>
      <div className="flex items-end gap-2">
        <label className="flex-1 text-xs font-medium text-slate-600">Look back
          <select className="input mt-1.5" value={filters.days} onChange={(e) => set("days", e.target.value)} disabled={disabled}>
            {[3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
        </label>
        {active && (
          <button className="btn" onClick={reset} type="button">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
