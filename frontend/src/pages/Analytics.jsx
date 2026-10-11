import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { api } from "../api.js";
import { useApi } from "../hooks/useApi.js";
import { shortDate, signed, dateTime } from "../format.js";
import { Card, EmptyState, ErrorState, Spinner, Unavailable, Disclaimer } from "../components/ui.jsx";
import ModelPerformance from "../components/ModelPerformance.jsx";
import TopicBars from "../components/TopicBars.jsx";

const AXIS = { fontSize: 10, fill: "#78716c", fontFamily: "sans-serif" };
const TT = {
  contentStyle: { background: "#ffffff", border: "1px solid #1c1917", borderRadius: 0, boxShadow: "none", fontSize: 11, fontFamily: "sans-serif" },
  labelStyle: { color: "#1c1917", fontWeight: 700, fontFamily: "serif" },
};
const M = { top: 8, right: 8, bottom: 0, left: 0 };
const POPULAR = ["AAPL", "TSLA", "NVDA", "RELIANCE.NS", "TCS.NS", "INFY.NS"];

function Corr({ c, label }) {
  if (!c) return <p className="text-xs text-stone-400 font-serif italic">{label}: not enough overlapping trading days to compute.</p>;
  const a = Math.abs(c.r);
  const word = a < 0.2 ? "very weak" : a < 0.4 ? "weak" : a < 0.6 ? "moderate" : "strong";
  return (
    <p className="text-xs text-stone-700 font-serif">
      {label}: Pearson r = <strong className="text-stone-950 font-bold">{signed(c.r)}</strong> ({word} correlation) over {c.n} trading days
    </p>
  );
}

function ScatterPanel({ rows, yKey, title }) {
  const pts = rows.filter((r) => r.sentiment !== null && r[yKey] !== null && r[yKey] !== undefined);
  return (
    <div className="border border-stone-200 p-3 bg-stone-50/20">
      <h3 className="mb-2 font-serif font-bold text-xs text-stone-900 uppercase tracking-wider">{title}</h3>
      <div className="h-52" role="img" aria-label={`${title}: scatter of news sentiment against return`}>
        {pts.length < 3 ? (
          <p className="flex h-full items-center justify-center text-xs text-stone-400 font-serif italic">Not enough overlapping points to plot.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={M}>
              <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
              <XAxis type="number" dataKey="sentiment" name="Sentiment" domain={[-1, 1]} tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis type="number" dataKey={yKey} name="Return %" tick={AXIS} width={40} axisLine={false} tickLine={false} />
              <ZAxis range={[40, 40]} />
              <ReferenceLine x={0} stroke="#a8a29e" />
              <ReferenceLine y={0} stroke="#a8a29e" />
              <Tooltip {...TT} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={pts} fill="#000000" fillOpacity={0.7} isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default function Analytics() {
  const navigate = useNavigate();
  const { symbol } = useParams();
  const sym = symbol ? decodeURIComponent(symbol).toUpperCase() : null;
  const [range, setRange] = useState({ start: "", end: "" });
  const an = useApi((s) => (sym ? api.analytics(sym, range, s) : null), [sym, range.start, range.end]);
  const pr = useApi((s) => (sym ? api.prediction(sym, {}, s) : null), [sym]);
  const nw = useApi((s) => (sym ? api.news(sym, {}, s) : null), [sym]);

  if (!sym) {
    return (
      <EmptyState title="Pick a company first">
        Search for a company above to compare its news sentiment with price movement and review the model's track record.
        <div className="mt-6 border-t border-stone-200 pt-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">
            Select an active corporation for statistical review
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR.map((s) => (
              <button
                key={s}
                type="button"
                className="btn"
                onClick={() => navigate(`/analytics/${s}`)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </EmptyState>
    );
  }

  const rows = an.data?.series || [];
  const withNext = rows.map((r, i) => ({ ...r, next_return_pct: rows[i + 1]?.return_pct ?? null }));

  return (
    <div className="space-y-8">
      {/* Broadsheet Section Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-black pb-4">
        <div>
          <span className="broadsheet-kicker">Quantitative Intelligence · Statistical Models</span>
          <h1 className="font-serif font-black text-3xl sm:text-4xl text-stone-950 mt-1">
            {an.data?.profile?.name || sym} Analytics
          </h1>
          <p className="text-xs text-stone-500 font-serif italic mt-0.5">
            Cross-sectional evaluation of financial news sentiment versus actual price return sessions.
          </p>
        </div>
        <div className="flex gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-600 font-sans">
            From
            <input
              type="date"
              className="input mt-1"
              value={range.start}
              max={range.end || undefined}
              onChange={(e) => setRange({ ...range, start: e.target.value })}
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-600 font-sans">
            To
            <input
              type="date"
              className="input mt-1"
              value={range.end}
              min={range.start || undefined}
              onChange={(e) => setRange({ ...range, end: e.target.value })}
            />
          </label>
        </div>
      </div>

      {an.loading && !an.data && <Spinner label="Synthesising statistical records and cross-correlation" />}
      {an.error && <ErrorState error={an.error} onRetry={an.reload} />}

      {an.data && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="border border-stone-200 p-4">
              <h3 className="font-serif font-bold text-base text-stone-900 mb-1 border-b border-stone-100 pb-1">
                Daily Price Change ({an.data.range[0]} to {an.data.range[1]})
              </h3>
              <div className="h-56 mt-3" role="img" aria-label="Daily percentage price change">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} margin={M}>
                    <CartesianGrid stroke="#f5f5f4" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={AXIS} tickFormatter={shortDate} minTickGap={40} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS} width={40} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                    <Tooltip {...TT} formatter={(v) => `${Number(v).toFixed(2)}%`} />
                    <Bar dataKey="return_pct" name="Change" isAnimationActive={false}>
                      {rows.map((r) => (
                        <Cell key={r.date} fill={(r.return_pct ?? 0) >= 0 ? "#15803d" : "#be123c"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="border border-stone-200 p-4">
              <h3 className="font-serif font-bold text-base text-stone-900 mb-1 border-b border-stone-100 pb-1">
                Sentiment Over Time (Daily Trading Sessions)
              </h3>
              <div className="h-56 mt-3" role="img" aria-label="News sentiment over time">
                {rows.some((r) => r.sentiment !== null) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rows} margin={M}>
                      <CartesianGrid stroke="#f5f5f4" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={AXIS} tickFormatter={shortDate} minTickGap={40} axisLine={false} tickLine={false} />
                      <YAxis domain={[-1, 1]} tick={AXIS} width={40} axisLine={false} tickLine={false} />
                      <ReferenceLine y={0} stroke="#a8a29e" />
                      <Tooltip {...TT} formatter={(v) => signed(v)} />
                      <Line dataKey="sentiment" name="Sentiment" stroke="#000000" strokeWidth={2} dot={{ r: 2.5, fill: "#000" }} connectNulls isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center px-6 text-center text-xs text-stone-400 font-serif italic">
                    No analysed news in this date range. Free news sources cover only recent weeks.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Returns compared with news sentiment */}
          <div className="border border-stone-200 p-5 space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900 border-b border-stone-100 pb-2">
              Returns Compared with News Sentiment
            </h3>
            <p className="text-xs text-stone-500 font-serif italic -mt-2">
              Bars: daily return (left axis). Line: aggregated news sentiment (right axis).
            </p>

            <div className="h-64" role="img" aria-label="Daily returns and news sentiment on the same dates">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rows} margin={{ ...M, right: 0 }}>
                  <CartesianGrid stroke="#f5f5f4" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={AXIS} tickFormatter={shortDate} minTickGap={40} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="r" tick={AXIS} width={40} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="s" orientation="right" domain={[-1, 1]} tick={AXIS} width={34} axisLine={false} tickLine={false} />
                  <Tooltip {...TT} />
                  <Bar yAxisId="r" dataKey="return_pct" name="Return %" fill="#78716c" fillOpacity={0.5} isAnimationActive={false} />
                  <Line yAxisId="s" dataKey="sentiment" name="Sentiment" stroke="#000000" strokeWidth={2} dot={{ r: 2 }} connectNulls isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-stone-100">
              <ScatterPanel rows={withNext} yKey="return_pct" title="Sentiment vs Same-Session Return" />
              <ScatterPanel rows={withNext} yKey="next_return_pct" title="Sentiment vs Next-Session Return" />
            </div>

            <div className="space-y-1.5 border-t border-stone-200 pt-3">
              <Corr c={an.data.correlation.same_session} label="Same session" />
              <Corr c={an.data.correlation.next_session} label="Next session" />
              <Disclaimer>{an.data.correlation.note}</Disclaimer>
            </div>
          </div>
        </>
      )}

      {/* Model Performance */}
      <div className="border border-stone-900 p-5 bg-stone-50/20">
        <h3 className="font-serif font-black text-xl text-stone-950 mb-1 border-b border-stone-300 pb-2">
          Trend Model Evaluation & Held-Out Backtesting
        </h3>
        <p className="text-xs text-stone-500 font-serif italic mb-4">
          Compared on trading days the model never observed during training to prevent overfit.
        </p>
        {pr.loading && !pr.data && <Spinner label="Training and evaluating candidate classifiers" />}
        {pr.error && <Unavailable what="Model evaluation" reason={pr.error.message} />}
        {pr.data && <ModelPerformance p={pr.data} />}
      </div>

      {/* Prediction History Table */}
      {an.data?.prediction_history?.length > 0 && (
        <div className="border border-stone-200 p-5">
          <h3 className="font-serif font-bold text-base text-stone-900 mb-1 border-b border-stone-100 pb-2">
            Historical Forecasts Stored by FinSight
          </h3>
          <div className="overflow-x-auto mt-3">
            <table className="w-full min-w-[420px] text-left text-xs font-serif">
              <thead className="border-b border-black font-sans font-bold uppercase text-[10px] text-stone-600">
                <tr>
                  <th className="py-2">Made at</th>
                  <th>Horizon</th>
                  <th>Forecast</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {an.data.prediction_history.slice(0, 10).map((p, i) => (
                  <tr key={i} className="hover:bg-stone-50">
                    <td className="py-2 text-stone-700">{dateTime(p.predicted_at)}</td>
                    <td className="text-stone-700">{p.horizon_days} sessions</td>
                    <td className="font-bold text-stone-950">{p.label}</td>
                    <td className="text-stone-700 font-sans">
                      {p.confidence != null ? (p.confidence > 0.99 ? ">99%" : `${(p.confidence * 100).toFixed(0)}%`) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {nw.data && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="border border-stone-200 p-4">
            <h3 className="font-serif font-bold text-base text-stone-900 mb-2 border-b border-stone-100 pb-1">
              Frequent Financial Topics
            </h3>
            <TopicBars items={nw.data.topics.topics} emptyText="No topics yet." />
          </div>
          <div className="border border-stone-200 p-4">
            <h3 className="font-serif font-bold text-base text-stone-900 mb-2 border-b border-stone-100 pb-1">
              Frequently Mentioned Organisations
            </h3>
            <TopicBars items={nw.data.topics.companies} color="#15803d" emptyText="No organisations recognised." />
          </div>
        </div>
      )}
    </div>
  );
}
