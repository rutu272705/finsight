import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { shortDate } from "../format.js";

const AXIS = { fontSize: 11, fill: "#64748B" };
const f = (v) => (v === null || v === undefined ? "—" : (v * 100).toFixed(1) + "%");

function rolling(backtest, window = 20) {
  return backtest.map((row, i) => {
    const slice = backtest.slice(Math.max(0, i - window + 1), i + 1);
    return { date: row.date, accuracy: slice.length >= 10 ? slice.filter((r) => r.correct).length / slice.length : null };
  });
}

export function ConfusionMatrix({ cm }) {
  const max = Math.max(1, ...cm.matrix.flat());
  return (
    <div>
      <p className="mb-2 text-xs text-slate-500">Rows: actual outcome. Columns: predicted.</p>
      <table className="w-full table-fixed border-separate border-spacing-1 text-center text-xs">
        <thead>
          <tr>
            <th className="w-20" />
            {cm.labels.map((l) => (
              <th key={l} className="font-semibold text-slate-700 py-1">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cm.matrix.map((row, i) => (
            <tr key={cm.labels[i]}>
              <th scope="row" className="text-right font-semibold text-slate-700 pr-2">
                {cm.labels[i]}
              </th>
              {row.map((v, j) => (
                <td
                  key={j}
                  className="rounded-lg py-2.5 font-bold text-slate-900 border border-slate-200/50"
                  style={{ background: `rgba(2, 132, 199, ${(v / max) * 0.35 + 0.05})` }}
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ModelPerformance({ p }) {
  const roll = rolling(p.backtest);
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <caption className="sr-only">Model comparison on the held-out test period</caption>
          <thead className="text-xs text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-2 pr-3 font-semibold">Model</th>
              <th className="px-2 font-semibold">CV F1</th>
              <th className="px-2 font-semibold">Accuracy</th>
              <th className="px-2 font-semibold">Precision</th>
              <th className="px-2 font-semibold">Recall</th>
              <th className="px-2 font-semibold">F1</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {p.comparison.map((c) => (
              <tr key={c.model} className={c.model === p.model_name ? "bg-blue-50/50" : ""}>
                <th scope="row" className="py-2.5 pr-3 font-medium text-slate-900">
                  {c.model}
                  {c.model === p.model_name && (
                    <span className="ml-2 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      selected
                    </span>
                  )}
                </th>
                <td className="px-2 text-slate-600 font-medium">{f(c.cv_f1_macro)}</td>
                <td className="px-2 text-slate-900 font-semibold">{f(c.test.accuracy)}</td>
                <td className="px-2 text-slate-600">{f(c.test.precision_macro)}</td>
                <td className="px-2 text-slate-600">{f(c.test.recall_macro)}</td>
                <td className="px-2 text-slate-600">{f(c.test.f1_macro)}</td>
              </tr>
            ))}
            <tr className="text-slate-500">
              <th scope="row" className="py-2.5 pr-3 font-medium text-slate-500">Baseline: most common class</th>
              <td className="px-2">—</td>
              <td className="px-2 font-medium">{f(p.baseline.accuracy)}</td>
              <td className="px-2">{f(p.baseline.precision_macro)}</td>
              <td className="px-2">{f(p.baseline.recall_macro)}</td>
              <td className="px-2">{f(p.baseline.f1_macro)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-slate-500">
          Scores are macro-averaged over the three classes on {p.n_test} unseen trading days ({p.test_period[0]} to {p.test_period[1]}). CV F1 is walk-forward cross-validation on the training period.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Confusion matrix (selected model)</h3>
          <ConfusionMatrix cm={p.test_metrics.confusion_matrix} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Rolling accuracy on unseen days</h3>
          <div className="h-44" role="img" aria-label="Rolling 20-day accuracy of the model on the test period">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={roll} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={AXIS} tickFormatter={shortDate} minTickGap={50} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 1]} tick={AXIS} width={36} tickFormatter={(v) => `${Math.round(v * 100)}%`} axisLine={false} tickLine={false} />
                <ReferenceLine
                  y={p.baseline.accuracy}
                  stroke="#D97706"
                  strokeDasharray="4 4"
                  label={{ value: "baseline", fill: "#D97706", fontSize: 10, position: "insideTopRight" }}
                />
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 8, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: 12 }}
                  formatter={(v) => (v === null ? "—" : `${(v * 100).toFixed(0)}%`)}
                />
                <Line dataKey="accuracy" stroke="#0284C7" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} name="Accuracy" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Most influential features</h3>
          <ul className="space-y-2">
            {p.feature_importance.map((fi) => (
              <li key={fi.feature} className="text-xs">
                <div className="mb-1 flex justify-between font-medium text-slate-700">
                  <span>{fi.feature}</span>
                  <span className="font-semibold text-slate-900">{(fi.importance * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all"
                    style={{ width: `${Math.min(fi.importance * 100 * 2.5, 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2 text-xs leading-relaxed text-slate-600 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <p>
            <strong className="text-slate-900">Setup.</strong> {p.definition} Trained on {p.n_train} days ({p.train_period[0]} to {p.train_period[1]}) with a {p.horizon_days}-day gap before the test period so no label overlaps it.
          </p>
          <p>
            <strong className="text-slate-900">News feature coverage.</strong> {p.sentiment_coverage_pct}% of training days have news sentiment. News APIs only reach back a few weeks, so the sentiment features are mostly empty historically and the model leans on price patterns.
          </p>
          <p>
            <strong className="text-slate-900">Reading these numbers.</strong> Short-term returns are close to random. If accuracy is near the baseline, the model has found little usable signal.
          </p>
        </div>
      </div>
    </div>
  );
}
