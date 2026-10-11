export default function TopicBars({ items, color = "#0284C7", emptyText = "None found yet." }) {
  if (!items?.length) return <p className="text-sm text-slate-500">{emptyText}</p>;
  const max = Math.max(...items.map((i) => i.count));
  return (
    <ul className="space-y-2.5">
      {items.map((t) => (
        <li key={t.name} className="text-xs">
          <div className="mb-1 flex justify-between gap-2 font-medium text-slate-700">
            <span className="truncate">{t.name}</span>
            <span className="text-slate-900 font-semibold">{t.count}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(t.count / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
