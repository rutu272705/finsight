const KIND = {
  company: "border-blue-200 bg-blue-50 text-blue-700 font-medium",
  person: "border-purple-200 bg-purple-50 text-purple-700 font-medium",
  ticker: "border-indigo-200 bg-indigo-50 text-indigo-700 font-medium",
  figure: "border-amber-200 bg-amber-50 text-amber-800 font-medium",
  topic: "border-slate-200 bg-slate-100 text-slate-700 font-medium",
};

function Group({ label, children }) {
  if (!children || children.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-20 shrink-0 text-xs font-medium text-slate-500">{label}</span>
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
  if (nothing) return <p className="text-xs text-slate-400">No entities were recognised in this article.</p>;
  return (
    <div className="space-y-2.5">
      <Group label="Companies">{entities.companies?.map((c) => <Tag key={c} kind="company">{c}</Tag>)}</Group>
      <Group label="People">{entities.people?.map((c) => <Tag key={c} kind="person">{c}</Tag>)}</Group>
      <Group label="Tickers">{entities.tickers?.map((c) => <Tag key={c} kind="ticker">{c}</Tag>)}</Group>
      <Group label="Figures">
        {figures.map((f, i) => (
          <Tag key={i} kind="figure">
            {f.text}<span className="text-amber-600/80"> · {f.context || "unlabelled"}</span>
          </Tag>
        ))}
      </Group>
      <Group label="Topics">{entities.topics?.map((c) => <Tag key={c} kind="topic">{c}</Tag>)}</Group>
    </div>
  );
}
