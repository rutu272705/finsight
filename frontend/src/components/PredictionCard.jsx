import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowRight, ArrowUpRight, FlaskConical } from "lucide-react";
import { TREND, dateTime } from "../format.js";
import { Disclaimer, Unavailable } from "./ui.jsx";

const showPct = (p) => (p < 0.01 ? "<1%" : p > 0.99 ? ">99%" : `${(p * 100).toFixed(0)}%`);
const ICON = { Upward: ArrowUpRight, Downward: ArrowDownRight, Stable: ArrowRight };
const OUTCOMES = {
  Upward: "Price may rise",
  Stable: "Little change",
  Downward: "Price may fall",
};

export default function PredictionCard({ prediction, symbol }) {
  if (prediction?.unavailable) return <Unavailable what="Trend forecast" reason={prediction.reason} />;
  const Icon = ICON[prediction.label];
  const tone = TREND[prediction.label];
  const m = prediction.test_metrics;
  const edge = m.accuracy - prediction.baseline.accuracy;
  const thresholdPct = ((prediction.threshold ?? 0.01) * 100).toFixed(1).replace(/\.0$/, "");
  const horizon = prediction.horizon_days;
  const outcome = OUTCOMES[prediction.label] || prediction.label;
  const accuracy = (m.accuracy * 100).toFixed(0);
  const baselineAccuracy = (prediction.baseline.accuracy * 100).toFixed(0);
  const comparison = edge < -0.03
    ? "On this past test, the model did worse than the simple guess."
    : edge < 0.03
      ? "On this past test, the model was about as accurate as the simple guess."
      : "On this past test, the model did better than the simple guess.";

  return (
    <div>
      <div className="flex items-center gap-2 border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-950">
        <FlaskConical className="h-4 w-4 shrink-0 text-amber-800" aria-hidden />
        <strong>Experimental estimate.</strong> Not financial advice. This computer-generated result is not a promise about the stock.
      </div>

      <div className="mt-4 flex items-center gap-3 border-b border-stone-200 pb-4">
        <div className={`p-2.5 border border-stone-300 ${prediction.label === "Upward" ? "bg-emerald-50 text-emerald-800" : prediction.label === "Downward" ? "bg-rose-50 text-rose-800" : "bg-stone-100 text-stone-800"}`}>
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-sans">FinSight's estimate for the next {horizon} trading days</p>
          <p className={`mt-0.5 font-serif text-2xl font-black leading-tight ${tone.text}`}>{outcome}</p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-stone-700">
        For this {horizon}-day period, “rise” means up more than {thresholdPct}%, “fall” means down more than {thresholdPct}%, and “little change” means between those amounts.
      </p>

      <details className="mt-3 border-y border-stone-200 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-stone-900 hover:underline">
          Why did the model make this estimate?
        </summary>
        <div className="mt-3 space-y-2">
          {prediction.explanation?.length ? (
            <>
              <p className="text-xs leading-relaxed text-stone-700">
                These are the inputs that most changed the model's estimate for <strong>{outcome}</strong>, compared with using typical values from its training data:
              </p>
              <ul className="space-y-2">
                {prediction.explanation.map((item) => (
                  <li key={item.feature} className="border-l-2 border-stone-400 pl-3 text-xs leading-relaxed text-stone-700">
                    <strong className="text-stone-900">{item.label}</strong>{" "}
                    {item.direction} the model's estimate by about <strong>{item.impact_pp} percentage points</strong>.
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-xs leading-relaxed text-stone-700">
              No single input noticeably changed this estimate compared with its typical value in the training data.
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-stone-500">
            This explanation compares one input at a time while keeping the others unchanged. Inputs can overlap, so this is an explanation of the model's calculation—not proof of what caused a price move or what will happen next.
          </p>
        </div>
      </details>

      <div className="mt-4">
        <h4 className="text-xs font-bold text-stone-900">How the model weighs each outcome</h4>
        <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600">These are the model's estimates—not guaranteed chances that an outcome will happen.</p>
      </div>
      <ul className="mt-3 space-y-3" aria-label="Model estimates for each outcome">
        {["Upward", "Stable", "Downward"].map((k) => (
          <li key={k} className="text-xs">
            <div className="mb-1 flex items-baseline justify-between gap-3 font-sans text-stone-700">
              <span className="font-semibold">{OUTCOMES[k]}</span>
              <span>{showPct(prediction.probabilities[k])}</span>
            </div>
            <div
              className="h-2 overflow-hidden border border-stone-200 bg-stone-100"
              role="img"
              aria-label={`${OUTCOMES[k]}: model estimate ${showPct(prediction.probabilities[k])}`}
            >
              <div className="h-full transition-all" style={{ width: `${prediction.probabilities[k] * 100}%`, background: TREND[k].hex }} />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-stone-200 pt-3">
        <h4 className="text-xs font-bold text-stone-900">How did it do on past data?</h4>
        <p className="mt-1 text-xs leading-relaxed text-stone-700">
          It matched the outcome on <strong>{accuracy}%</strong> of past test dates. A simple guess based on the most common past result got <strong>{baselineAccuracy}%</strong>.
        </p>
        <p className={`mt-2 border p-2.5 text-xs leading-relaxed ${edge < 0.03 ? "border-amber-200 bg-amber-50 text-amber-950" : "border-stone-200 bg-stone-50 text-stone-700"}`}>
          {comparison} Past results do not tell us what will happen next.
        </p>
      </div>

      <details className="mt-3 border-t border-stone-200 pt-3 text-xs">
        <summary className="cursor-pointer font-semibold text-stone-800 hover:underline">More about this forecast</summary>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 leading-relaxed">
          <dt className="text-stone-500">Method used</dt>
          <dd className="text-right font-semibold text-stone-800">{prediction.model_name}</dd>
          <dt className="text-stone-500">Price data through</dt>
          <dd className="text-right text-stone-800">{prediction.as_of_date}</dd>
          <dt className="text-stone-500">Estimate created</dt>
          <dd className="text-right text-stone-800">{dateTime(prediction.predicted_at)}</dd>
          <dt className="text-stone-500">Number of past test dates</dt>
          <dd className="text-right text-stone-800">{m.n ?? "Not available"}</dd>
        </dl>
        <p className="mt-2 text-stone-600">{prediction.definition}</p>
      </details>

      <div className="mt-3"><Disclaimer>{prediction.disclaimer}</Disclaimer></div>

      <Link to={`/analytics/${symbol}`} className="mt-3 inline-block text-xs font-bold uppercase tracking-wider text-stone-900 hover:underline">
        See detailed model results →
      </Link>
    </div>
  );
}
