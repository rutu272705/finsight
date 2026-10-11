const KIND = {
  company: "border border-stone-300 bg-stone-100 text-stone-900 font-bold uppercase text-[10px]",
  person: "border border-stone-300 bg-stone-100 text-stone-900 font-bold uppercase text-[10px]",
  ticker: "border border-black bg-stone-900 text-white font-bold uppercase text-[10px]",
  figure: "border border-amber-300 bg-amber-50 text-amber-950 font-bold uppercase text-[10px]",
  topic: "border border-stone-300 bg-white text-stone-800 font-serif text-[11px]",
};

function Group({ label, children }) {
  if (!children || children.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-wider text-stone-500 font-sans">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

const Tag = ({ kind, children }) => <span className={`chip ${KIND[kind]}`}>{children}</span>;

export default function EntityTags({ entities }) {
  if (!entities) return null;
  const figures = [...(entities.money || []), ...(entities.percentages || [])];
  const nothing =
    !entities.companies?.length &&
    !entities.people?.length &&
    !entities.tickers?.length &&
    !figures.length &&
    !entities.topics?.length;
  if (nothing) return <p className="text-xs text-stone-400 font-serif italic">No entities were recognised in this article.</p>;
  return (
    <div className="space-y-2">
      <Group label="Companies">{entities.companies?.map((c) => <Tag key={c} kind="company">{c}</Tag>)}</Group>
      <Group label="People">{entities.people?.map((c) => <Tag key={c} kind="person">{c}</Tag>)}</Group>
      <Group label="Tickers">{entities.tickers?.map((c) => <Tag key={c} kind="ticker">{c}</Tag>)}</Group>
      <Group label="Figures">
        {figures.map((f, i) => (
          <Tag key={i} kind="figure">
            {f.text}<span className="text-amber-800"> · {f.context || "unlabelled"}</span>
          </Tag>
        ))}
      </Group>
      <Group label="Topics">{entities.topics?.map((c) => <Tag key={c} kind="topic">{c}</Tag>)}</Group>
    </div>
  );
}
