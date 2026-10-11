export default function TopicBars({ items, color = "#1c1917", emptyText = "None found yet." }) {
  if (!items?.length) return <p className="text-xs text-stone-500 font-serif italic">{emptyText}</p>;
  const max = Math.max(...items.map((i) => i.count));
  return (
    <ul className="space-y-2.5">
      {items.map((t) => (
        <li key={t.name} className="text-xs">
          <div className="mb-1 flex justify-between gap-2 font-serif text-stone-800">
            <span className="truncate">{t.name}</span>
            <span className="text-stone-950 font-bold font-sans">{t.count}</span>
          </div>
          <div className="h-1.5 bg-stone-100 overflow-hidden border border-stone-200">
            <div className="h-full transition-all" style={{ width: `${(t.count / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
