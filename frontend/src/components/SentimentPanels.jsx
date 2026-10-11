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

