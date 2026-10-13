const KIND = {
  company: "border border-stone-300 bg-stone-100 text-stone-900 font-bold uppercase text-[10px]",
  person: "border border-stone-300 bg-stone-100 text-stone-900 font-bold uppercase text-[10px]",
  ticker: "border border-black bg-stone-900 text-white font-bold uppercase text-[10px]",
  figure: "border border-amber-300 bg-amber-50 text-amber-950 font-bold uppercase text-[10px]",
  topic: "border border-stone-300 bg-white text-stone-800 font-serif text-[11px]",
};

const TOPIC_LABELS = {
  Earnings: "Company results",
  Revenue: "Sales and money earned",
  Profit: "Profit",
  Losses: "Losses",
  "Mergers & Acquisitions": "Company mergers or purchases",
  "Dividends & Buybacks": "Payments to shareholders",
  Inflation: "Rising prices",
  "Interest Rates": "Interest rates",
  Regulation: "Rules or legal issues",
  "Analyst Ratings": "Analyst opinions",
  "Guidance & Outlook": "Company outlook",
  "Layoffs & Hiring": "Jobs and hiring",
  "IPO & Funding": "Funding or going public",
  "Supply Chain": "Making and shipping products",
  "Product & Innovation": "Products and new ideas",
  "Market Movement": "Stock-price movement",
};

const FIGURE_LABELS = {
  revenue: "sales or money earned",
  profit: "profit",
  loss: "loss",
  "deal value": "deal value",
  dividend: "shareholder payment",
  guidance: "company outlook",
  "market cap": "company value",
  "share price": "stock price",
  funding: "funding",
  debt: "borrowed money",
};

function Group({ label, children }) {
  if (!children || children.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-32 shrink-0 text-[10px] font-bold uppercase tracking-wider text-stone-500 font-sans">{label}</span>
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
  if (nothing) return <p className="text-xs text-stone-500 font-serif italic">No names, numbers, or common financial topics stood out in the text.</p>;
  return (
    <div className="space-y-2">
      <Group label="Company names">{entities.companies?.map((c) => <Tag key={c} kind="company">{c}</Tag>)}</Group>
      <Group label="People's names">{entities.people?.map((c) => <Tag key={c} kind="person">{c}</Tag>)}</Group>
      <Group label="Stock codes">{entities.tickers?.map((c) => <Tag key={c} kind="ticker">{c}</Tag>)}</Group>
      <Group label="Numbers found">
        {figures.map((f, i) => (
          <Tag key={i} kind="figure">
            {f.text}<span className="text-amber-800"> · {FIGURE_LABELS[f.context] || f.context || "number"}</span>
          </Tag>
        ))}
      </Group>
      <Group label="Topics mentioned">{entities.topics?.map((c) => <Tag key={c} kind="topic">{TOPIC_LABELS[c] || c}</Tag>)}</Group>
    </div>
  );
}
