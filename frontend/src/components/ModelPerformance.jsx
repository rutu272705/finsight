import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { shortDate } from "../format.js";

const AXIS = { fontSize: 10, fill: "#78716c", fontFamily: "sans-serif" };
const f = (v) => (v === null || v === undefined ? "—" : (v * 100).toFixed(1) + "%");
const OUTCOME_LABEL = { Downward: "Price fell", Stable: "Little change", Upward: "Price rose" };
const FEATURE_LABEL = {
  ret_1: "Price change yesterday",
  ret_5: "Price change over 5 days",
  ret_10: "Price change over 10 days",
  ret_20: "Price change over 20 days",
  sma5_vs_sma20: "Short-term vs longer-term price trend",
  close_vs_sma20: "Price vs 20-day average",
  close_vs_sma50: "Price vs 50-day average",
  volatility_10: "Price swings over 10 days",
  volatility_20: "Price swings over 20 days",
  volume_ratio_20: "Trading activity vs 20-day average",
  volume_chg_1: "Change in trading activity",
  rsi_14: "Recent buying/selling strength",
  macd_hist: "Change in price momentum",
  bb_position: "Price position within its recent range",
  hl_range_5: "Typical daily price range",
  sent_mean_5: "Average news tone over 5 days",
  sent_count_5: "Number of news items over 5 days",
  sent_available: "Whether news tone was available",
};

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
      <p className="mb-2 text-xs leading-relaxed text-stone-600">
        Each number counts past test days. Read across a row to see the model's guesses for what actually happened. Numbers along the diagonal are correct guesses; other cells are misses.
      </p>
      <table className="w-full table-fixed border-collapse text-center text-xs font-serif">
        <thead>
          <tr className="border-b border-black">
            <th className="w-24 text-left text-[10px] text-stone-600">Actually happened ↓<br />Model guessed →</th>
            {cm.labels.map((l) => (
              <th key={l} className="font-sans font-bold uppercase text-[10px] text-stone-700 py-1.5">
                {OUTCOME_LABEL[l] || l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {cm.matrix.map((row, i) => (
            <tr key={cm.labels[i]}>
              <th scope="row" className="text-right font-sans font-bold text-stone-700 pr-2 text-[10px] uppercase">
                {OUTCOME_LABEL[cm.labels[i]] || cm.labels[i]}
              </th>
              {row.map((v, j) => (
                <td
                  key={j}
                  className="py-2.5 font-bold text-stone-950 border border-stone-200"
                  style={{ background: `rgba(28, 25, 23, ${(v / max) * 0.2 + (i === j ? 0.08 : 0.02)})` }}
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
  const accuracy = p.test_metrics.accuracy;
  const baselineAccuracy = p.baseline.accuracy;
  const testedDays = p.test_metrics.n ?? p.n_test;
  const modelCorrect = Math.round(accuracy * testedDays);
  const simpleGuessCorrect = Math.round(baselineAccuracy * testedDays);
  const difference = accuracy - baselineAccuracy;
  const takeaway = difference > 0.03
    ? "In this past test, the model got more days right than the simple guess. That is encouraging, but it does not guarantee future forecasts will be right."
    : difference < -0.03
      ? "In this past test, the model got fewer days right than the simple guess. Its results did not show an advantage over the simple approach."
      : "In this past test, the model performed about the same as the simple guess. It did not show a clear advantage.";

  return (
    <div className="space-y-5">
      <div className={`border p-4 sm:p-5 ${difference < -0.03 ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-white"}`}>
        <h4 className="font-serif text-lg font-bold text-stone-950">The short answer</h4>
        <p className="mt-1 text-sm leading-relaxed text-stone-700">{takeaway}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { label: "FinSight's forecast model", correct: modelCorrect, score: accuracy, color: "#1c1917" },
            { label: "Simple guess", correct: simpleGuessCorrect, score: baselineAccuracy, color: "#a8a29e" },
          ].map((item) => (
            <div key={item.label} className="border border-stone-200 bg-white p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-stone-700">{item.label}</span>
                <span className="text-sm font-bold text-stone-950">{Math.round(item.score * 100)}%</span>
              </div>
              <div
                className="mt-2 h-2.5 overflow-hidden bg-stone-100"
                role="img"
                aria-label={`${item.label}: ${Math.round(item.score * 100)}% correct`}
              >
                <div className="h-full" style={{ width: `${Math.max(0, Math.min(item.score * 100, 100))}%`, backgroundColor: item.color }} />
              </div>
              <p className="mt-2 text-xs text-stone-600">
                Got <strong className="text-stone-900">{item.correct} of {testedDays}</strong> past days right
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
          This is a test on past dates the model had not seen while learning. It describes past results only; it cannot tell us what the stock will do next.
        </p>
      </div>

      <details className="border-t border-stone-200 pt-3">
        <summary className="cursor-pointer text-sm font-semibold text-stone-800 hover:underline">
          See detailed charts and technical scores
        </summary>
        <div className="mt-4 space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs font-serif">
          <caption className="sr-only">Model comparison on the held-out test period</caption>
          <thead className="border-b-2 border-black font-sans font-bold uppercase text-[10px] text-stone-700">
            <tr>
              <th className="py-2 pr-3">Method</th>
              <th className="px-2">Validation score</th>
              <th className="px-2">Correct guesses</th>
              <th className="px-2">Precision</th>
              <th className="px-2">Recall</th>
              <th className="px-2">F1 score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {p.comparison.map((c) => (
              <tr key={c.model} className={c.model === p.model_name ? "bg-stone-50 font-bold" : ""}>
                <th scope="row" className="py-2.5 pr-3 text-stone-900 font-bold">
                  {c.model}
                  {c.model === p.model_name && (
                    <span className="ml-2 border border-black bg-black px-1.5 py-0.2 text-[9px] font-sans font-bold uppercase text-white tracking-wider">
                      used for forecast
                    </span>
                  )}
                </th>
                <td className="px-2 text-stone-700">{f(c.cv_f1_macro)}</td>
                <td className="px-2 text-stone-950 font-bold">{f(c.test.accuracy)}</td>
                <td className="px-2 text-stone-700">{f(c.test.precision_macro)}</td>
                <td className="px-2 text-stone-700">{f(c.test.recall_macro)}</td>
                <td className="px-2 text-stone-700">{f(c.test.f1_macro)}</td>
              </tr>
            ))}
            <tr className="text-stone-500 font-sans text-[11px]">
              <th scope="row" className="py-2.5 pr-3 font-normal text-stone-500">Simple guess (most common outcome)</th>
              <td className="px-2">—</td>
              <td className="px-2 font-medium">{f(p.baseline.accuracy)}</td>
              <td className="px-2">{f(p.baseline.precision_macro)}</td>
              <td className="px-2">{f(p.baseline.recall_macro)}</td>
              <td className="px-2">{f(p.baseline.f1_macro)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs leading-relaxed text-stone-600">
          “Correct guesses” is the share of test dates predicted correctly. Higher is better; compare it with the simple-guess row. The other columns are extra technical measures of how well each method handled each outcome.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 pt-2 border-t border-stone-200">
        <div>
          <h3 className="mb-2 font-serif font-bold text-sm text-stone-900 border-b border-stone-100 pb-1">
            Which guesses were right or wrong?
          </h3>
          <ConfusionMatrix cm={p.test_metrics.confusion_matrix} />
        </div>
        <div>
          <h3 className="mb-2 font-serif font-bold text-sm text-stone-900 border-b border-stone-100 pb-1">
            How often were recent test guesses correct?
          </h3>
          <p className="mb-2 text-xs leading-relaxed text-stone-600">
            The line shows the share of correct guesses over a moving group of recent test days. The dotted line is the simple-guess score. Above it is better; below it is worse.
          </p>
          <div className="h-44" role="img" aria-label="Rolling 20-day accuracy of the model on the test period">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={roll} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#f5f5f4" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={AXIS} tickFormatter={shortDate} minTickGap={50} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 1]} tick={AXIS} width={36} tickFormatter={(v) => `${Math.round(v * 100)}%`} axisLine={false} tickLine={false} />
                <ReferenceLine
                  y={p.baseline.accuracy}
                  stroke="#a8a29e"
                  strokeDasharray="4 4"
                  label={{ value: "simple guess", fill: "#78716c", fontSize: 10, position: "insideTopRight" }}
                />
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #1c1917", borderRadius: 0, fontSize: 11 }}
                  formatter={(v) => (v === null ? "—" : [`${(v * 100).toFixed(0)}%`, "Correct guesses"])}
                />
                <Line dataKey="accuracy" stroke="#000000" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} name="Share of guesses correct" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 pt-2 border-t border-stone-200">
        <div>
          <h3 className="mb-2 font-serif font-bold text-sm text-stone-900 border-b border-stone-100 pb-1">
            What information influenced the model most?
          </h3>
          <p className="mb-3 text-xs leading-relaxed text-stone-600">
            These bars show which inputs mattered most to this model's calculations. They are not proof that an input caused a price move or will predict the future.
          </p>
          <ul className="space-y-2">
            {p.feature_importance.map((fi) => (
              <li key={fi.feature} className="text-xs">
                <div className="mb-1 flex justify-between font-sans text-stone-700 font-bold text-[11px]">
                  <span>{FEATURE_LABEL[fi.feature] || fi.feature}</span>
                  <span className="text-stone-950">{(fi.importance * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-stone-100 overflow-hidden border border-stone-200">
                  <div
                    className="h-full bg-stone-900 transition-all"
                    style={{ width: `${Math.min(fi.importance * 100, 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2 text-xs leading-relaxed text-stone-700 font-serif border border-stone-200 bg-stone-50/50 p-4">
          <p>
            <strong className="text-stone-950 font-sans uppercase tracking-wider text-[10px] block">How the test was done:</strong>
            The model learned from {p.n_train} past trading days ({p.train_period[0]} to {p.train_period[1]}), then was checked against later days that were kept out of training.
          </p>
          <p>
            <strong className="text-stone-950 font-sans uppercase tracking-wider text-[10px] block">How much news was available:</strong>
            News tone was available for {p.sentiment_coverage_pct}% of the days used to train the model. For other days, the model relied more on price and trading activity.
          </p>
          <p>
            <strong className="text-stone-950 font-sans uppercase tracking-wider text-[10px] block">A note about forecasts:</strong>
            Stock prices can be difficult to predict. If the model performs about the same as the simple guess, it may not be finding a useful pattern in the past data.
          </p>
        </div>
      </div>
        </div>
      </details>
    </div>
  );
}
