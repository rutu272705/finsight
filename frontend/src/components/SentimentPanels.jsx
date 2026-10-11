import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SENTIMENT, signed } from "../format.js";
import { SentimentBadge } from "./ui.jsx";

export function SentimentSummary({ aggregate }) {
  const score = aggregate.score;
  const marker = Math.max(0, Math.min(100, ((score + 1) / 2) * 100));
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">Overall news sentiment</p>
          <p className={`text-4xl font-bold leading-none ${SENTIMENT[aggregate.label].text}`} aria-label={`Sentiment score ${signed(score)}`}>
            {signed(score)}
          </p>
        </div>
        <SentimentBadge label={aggregate.label} />
      </div>
      <div className="relative mt-4 h-2.5 rounded-full overflow-hidden" style={{ background: "linear-gradient(90deg,#E11D48 0%,#94A3B8 50%,#16A34A 100%)" }} aria-hidden>
        <span
          className="absolute top-1/2 h-5 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-slate-900 shadow-md"
          style={{ left: `${marker}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-medium text-slate-400">
        <span>−1 Negative</span>
        <span>0 Neutral</span>
        <span>+1 Positive</span>
      </div>
      <p className="mt-3 text-xs text-slate-600">
        Based on {aggregate.n_articles} article{aggregate.n_articles === 1 ? "" : "s"} (effective sample {aggregate.effective_sample_size}).
        {aggregate.low_sample && <span className="font-medium text-amber-700"> Low sample size, treat with caution.</span>}
      </p>
      <details className="mt-2.5 text-xs text-slate-500">
        <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-800">How is this calculated?</summary>
        <p className="mt-1.5 leading-relaxed rounded-md bg-slate-50 p-2.5 border border-slate-100">{aggregate.methodology}</p>
      </details>
    </div>
  );
}

export function SentimentDonut({ distribution }) {
  const data = ["positive", "neutral", "negative"].map((k) => ({
    key: k,
    name: SENTIMENT[k].label,
    value: distribution[k] || 0,
  }));
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="h-32 w-32 shrink-0" role="img" aria-label={`Sentiment distribution: ${data.map((d) => `${d.value} ${d.name.toLowerCase()}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={36} outerRadius={56} paddingAngle={total > 0 ? 3 : 0} stroke="#ffffff" strokeWidth={2} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.key} fill={SENTIMENT[d.key].hex} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 8, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: 12 }}
              itemStyle={{ color: "#0F172A", fontWeight: 500 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1.5 text-sm">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2">
            <i className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: SENTIMENT[d.key].hex }} />
            <span className="w-16 text-slate-600">{d.name}</span>
            <span className="font-semibold text-slate-900">{d.value}</span>
            <span className="text-xs text-slate-400">{total ? `${Math.round((d.value / total) * 100)}%` : "0%"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
