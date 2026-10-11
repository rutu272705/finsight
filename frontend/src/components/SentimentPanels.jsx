import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SENTIMENT, signed } from "../format.js";
import { SentimentBadge } from "./ui.jsx";

export function SentimentSummary({ aggregate }) {
  const score = aggregate.score;
  const marker = Math.max(0, Math.min(100, ((score + 1) / 2) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 border-b border-stone-100 pb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-sans">Headline Sentiment Score</p>
          <p className={`font-serif font-black text-4xl leading-none mt-1 ${SENTIMENT[aggregate.label].text}`} aria-label={`Sentiment score ${signed(score)}`}>
            {signed(score)}
          </p>
        </div>
        <SentimentBadge label={aggregate.label} />
      </div>
      <div className="relative mt-4 h-2 bg-stone-100 border border-stone-200" style={{ background: "linear-gradient(90deg,#be123c 0%,#78716c 50%,#15803d 100%)" }} aria-hidden>
        <span
          className="absolute top-1/2 h-4 w-2 -translate-x-1/2 -translate-y-1/2 border border-white bg-black shadow-sm"
          style={{ left: `${marker}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-sans font-bold uppercase tracking-wider text-stone-500">
        <span>−1 Bearish</span>
        <span>0 Neutral</span>
        <span>+1 Bullish</span>
      </div>
      <p className="mt-3 text-xs text-stone-600 font-serif">
        Calculated from {aggregate.n_articles} dispatch{aggregate.n_articles === 1 ? "" : "es"} (effective sample {aggregate.effective_sample_size}).
        {aggregate.low_sample && <span className="font-bold text-amber-900 font-sans text-[10px] uppercase ml-1">· Thin sample size</span>}
      </p>
      <details className="mt-2 text-xs text-stone-500 font-serif">
        <summary className="cursor-pointer text-stone-900 font-bold uppercase tracking-wider text-[10px] font-sans hover:underline">Methodology Formula</summary>
        <p className="mt-1.5 leading-relaxed bg-stone-50 p-2 border border-stone-200">{aggregate.methodology}</p>
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
      <div className="h-28 w-28 shrink-0" role="img" aria-label={`Sentiment distribution: ${data.map((d) => `${d.value} ${d.name.toLowerCase()}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={30} outerRadius={50} paddingAngle={total > 0 ? 2 : 0} stroke="#ffffff" strokeWidth={1.5} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.key} fill={SENTIMENT[d.key].hex} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#ffffff", border: "1px solid #1c1917", borderRadius: 0, fontSize: 11, fontFamily: "sans-serif" }}
              itemStyle={{ color: "#1c1917", fontWeight: 700 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1.5 text-xs font-serif divide-y divide-stone-100 flex-1">
        {data.map((d) => (
          <li key={d.key} className="flex items-center justify-between pt-1 font-serif">
            <span className="flex items-center gap-1.5">
              <i className="h-2 w-2 shrink-0" style={{ background: SENTIMENT[d.key].hex }} />
              <span className="text-stone-700">{d.name}</span>
            </span>
            <span className="font-sans font-bold text-stone-950">
              {d.value} <span className="text-stone-400 font-normal text-[10px]">({total ? `${Math.round((d.value / total) * 100)}%` : "0%"})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
