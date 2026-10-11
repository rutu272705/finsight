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
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800">
        <FlaskConical className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden /> Experimental model forecast, not financial advice
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${prediction.label === "Upward" ? "bg-emerald-50 text-emerald-700" : prediction.label === "Downward" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
          <Icon className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <p className="text-xs text-slate-500">Next {prediction.horizon_days} trading sessions</p>
          <p className={`text-3xl font-bold leading-tight ${tone.text}`}>{prediction.label}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2" aria-label="Class probabilities">
        {["Upward", "Stable", "Downward"].map((k) => (
          <li key={k} className="text-xs">
            <div className="mb-1 flex justify-between text-slate-600 font-medium">
              <span>{k}</span>
              <span>{showPct(prediction.probabilities[k])}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${prediction.probabilities[k] * 100}%`, background: TREND[k].hex }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">{prediction.definition}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs border-t border-slate-100 pt-3">
        <dt className="text-slate-500">Model</dt>
        <dd className="text-right font-medium text-slate-800">{prediction.model_name}</dd>
        <dt className="text-slate-500">Data up to</dt>
        <dd className="text-right font-medium text-slate-800">{prediction.as_of_date}</dd>
        <dt className="text-slate-500">Predicted at</dt>
        <dd className="text-right font-medium text-slate-800">{dateTime(prediction.predicted_at)}</dd>
        <dt className="text-slate-500">Held-out accuracy</dt>
        <dd className="text-right font-medium text-slate-800">
          {(m.accuracy * 100).toFixed(0)}% <span className="font-normal text-slate-500">vs {(prediction.baseline.accuracy * 100).toFixed(0)}% baseline</span>
        </dd>
      </dl>
      {edge < 0.03 && (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">
          On past unseen data this model was no more accurate than always guessing the most common outcome, so give this forecast little weight.
        </p>
      )}
      <div className="mt-3"><Disclaimer>{prediction.disclaimer}</Disclaimer></div>
      <Link to={`/analytics/${symbol}`} className="mt-3 inline-block text-xs font-medium text-blue-600 hover:text-blue-800">
        See model evaluation →
      </Link>
    </div>
  );
}
