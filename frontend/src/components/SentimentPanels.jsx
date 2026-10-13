import { SENTIMENT, signed } from "../format.js";
import { SentimentBadge } from "./ui.jsx";

export function SentimentSummary({ aggregate }) {
  const score = aggregate.score;
  const marker = score === null ? 50 : Math.max(0, Math.min(100, ((score + 1) / 2) * 100));
  const tone = aggregate.label === "positive"
    ? "more positive"
    : aggregate.label === "negative"
      ? "more negative"
      : "mostly neutral";
  const effectiveSample = Number.isFinite(aggregate.effective_sample_size)
    ? aggregate.effective_sample_size.toFixed(1)
    : "—";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 border-b border-stone-100 pb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-sans">Overall tone of the news</p>
          <p className={`font-serif font-black text-4xl leading-none mt-1 ${SENTIMENT[aggregate.label]?.text || "text-stone-500"}`} aria-label={`News tone score ${signed(score)} out of minus 1 to plus 1`}>
            {signed(score)}
          </p>
        </div>
        <SentimentBadge label={aggregate.label} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-stone-700">
        The stories analyzed have a <strong>{tone}</strong> overall. This describes the wording in the news, not whether a share price will rise or fall.
      </p>
      <div
        className="relative mt-4 h-2 border border-stone-200"
        style={{ background: "linear-gradient(90deg,#be123c 0%,#78716c 50%,#15803d 100%)" }}
        role="img"
        aria-label={`News tone scale from negative to positive, current score ${signed(score)}`}
      >
        <span
          className="absolute top-1/2 h-4 w-2 -translate-x-1/2 -translate-y-1/2 border border-white bg-black shadow-sm"
          style={{ left: `${marker}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-sans font-bold uppercase tracking-wider text-stone-500">
        <span>−1 Negative wording</span>
        <span>0 Neutral</span>
        <span>+1 Positive wording</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-stone-600">
        Based on <strong>{aggregate.n_articles}</strong> {aggregate.n_articles === 1 ? "story" : "stories"}.
        {" "}Since newer and more company-relevant stories count more, this is roughly like comparing {effectiveSample} equally weighted {Number(aggregate.effective_sample_size) === 1 ? "story" : "stories"}.
      </p>
      {aggregate.low_sample && (
        <p className="mt-2 border border-amber-200 bg-amber-50 p-2 text-xs leading-relaxed text-amber-950">
          Only a few stories were available, so treat this as an early signal rather than a firm conclusion.
        </p>
      )}
      <details className="mt-2 text-xs text-stone-500 font-serif">
        <summary className="cursor-pointer text-stone-900 font-bold text-xs font-sans hover:underline">How is this worked out?</summary>
        <div className="mt-1.5 space-y-2 bg-stone-50 p-2 leading-relaxed">
          <p>Each story gets a wording score from −1 (negative) to +1 (positive). Newer stories and stories more clearly about this company count more in the overall result.</p>
          <p className="border-t border-stone-200 pt-2 text-[10px] text-stone-500">Technical details: {aggregate.methodology}</p>
        </div>
      </details>
    </div>
  );
}
