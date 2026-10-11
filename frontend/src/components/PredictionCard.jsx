import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowRight, ArrowUpRight, FlaskConical } from "lucide-react";
import { TREND, dateTime } from "../format.js";
import { Disclaimer, Unavailable } from "./ui.jsx";

const showPct = (p) => (p < 0.01 ? "<1%" : p > 0.99 ? ">99%" : `${(p * 100).toFixed(0)}%`);
const ICON = { Upward: ArrowUpRight, Downward: ArrowDownRight, Stable: ArrowRight };

export default function PredictionCard({ prediction, symbol }) {
  if (prediction?.unavailable) return <Unavailable what="Trend forecast" reason={prediction.reason} />;
  const Icon = ICON[prediction.label];
  const tone = TREND[prediction.label];
  const m = prediction.test_metrics;
  const edge = m.accuracy - prediction.baseline.accuracy;

  return (
    <div>
      <div className="flex items-center gap-2 border border-stone-300 bg-stone-100 px-2.5 py-1 text-[11px] font-sans font-bold uppercase tracking-wider text-stone-800">
        <FlaskConical className="h-3.5 w-3.5 shrink-0 text-stone-700" aria-hidden /> Experimental model forecast, not financial advice
      </div>

      <div className="mt-4 flex items-center gap-3 border-b border-stone-200 pb-4">
        <div className={`p-2.5 border border-stone-300 ${prediction.label === "Upward" ? "bg-emerald-50 text-emerald-800" : prediction.label === "Downward" ? "bg-rose-50 text-rose-800" : "bg-stone-100 text-stone-800"}`}>
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 font-sans">
            Next {prediction.horizon_days} trading sessions
          </p>
          <p className={`font-serif font-black text-3xl leading-none mt-0.5 ${tone.text}`}>
            {prediction.label}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5" aria-label="Class probabilities">
        {["Upward", "Stable", "Downward"].map((k) => (
          <li key={k} className="text-xs">
            <div className="mb-1 flex justify-between font-sans text-stone-700 font-bold text-[11px]">
              <span>{k}</span>
              <span>{showPct(prediction.probabilities[k])}</span>
            </div>
            <div className="h-2 bg-stone-100 overflow-hidden border border-stone-200">
              <div className="h-full transition-all" style={{ width: `${prediction.probabilities[k] * 100}%`, background: TREND[k].hex }} />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-stone-600 font-serif italic">{prediction.definition}</p>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs border-t border-stone-200 pt-3 font-serif">
        <dt className="text-stone-500">Model</dt>
        <dd className="text-right font-bold text-stone-900 font-sans">{prediction.model_name}</dd>
        <dt className="text-stone-500">Data up to</dt>
        <dd className="text-right text-stone-800">{prediction.as_of_date}</dd>
        <dt className="text-stone-500">Predicted at</dt>
        <dd className="text-right text-stone-800">{dateTime(prediction.predicted_at)}</dd>
        <dt className="text-stone-500">Held-out accuracy</dt>
        <dd className="text-right font-bold text-stone-900 font-sans">
          {(m.accuracy * 100).toFixed(0)}% <span className="font-normal text-stone-500 text-[11px]">vs {(prediction.baseline.accuracy * 100).toFixed(0)}% baseline</span>
        </dd>
      </dl>

      {edge < 0.03 && (
        <p className="mt-3 border border-stone-300 bg-stone-50 p-2.5 text-xs leading-relaxed text-stone-700 font-serif italic">
          On past unseen data this model was no more accurate than always guessing the most common outcome, so give this forecast little weight.
        </p>
      )}

      <div className="mt-3"><Disclaimer>{prediction.disclaimer}</Disclaimer></div>

      <Link to={`/analytics/${symbol}`} className="mt-3 inline-block text-xs font-bold uppercase tracking-wider text-stone-900 hover:underline">
        See Model Backtest & Metrics →
      </Link>
    </div>
  );
}
