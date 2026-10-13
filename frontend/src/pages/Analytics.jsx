import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
        Search for a company above to see how its share price and news tone changed over time, and how the forecast model did on past data.
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

  return (
    <div className="space-y-8">
      {/* Broadsheet Section Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-black pb-4">
        <div>
          <span className="broadsheet-kicker">Company insights</span>
          <h1 className="font-serif font-black text-3xl sm:text-4xl text-stone-950 mt-1">
            {an.data?.profile?.name || sym} Analytics
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
          Explore past share-price moves, the tone of company news, and how the forecast model performed. These charts show patterns, not proof that news caused a price move.
          </p>
        </div>
        <div className="flex gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-600 font-sans">
          Start date
            <input
              type="date"
              className="input mt-1"
              value={range.start}
              max={range.end || undefined}
              onChange={(e) => setRange({ ...range, start: e.target.value })}
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-600 font-sans">
            End date
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

      {an.loading && !an.data && <Spinner label="Loading company analytics" />}
      {an.error && <ErrorState error={an.error} onRetry={an.reload} />}

      {an.data && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="border border-stone-200 p-4">
              <h3 className="font-serif font-bold text-base text-stone-900 mb-1 border-b border-stone-100 pb-1">
                How the share price moved each day ({an.data.range[0]} to {an.data.range[1]})
              </h3>
              <p className="text-xs leading-relaxed text-stone-600">
                Each bar is one day's percentage change from the previous close. Green means the price rose; red means it fell. Taller bars mean a bigger move.
              </p>
              <div className="h-56 mt-3" role="img" aria-label="Daily percentage price change">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} margin={M}>
                    <CartesianGrid stroke="#f5f5f4" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={AXIS} tickFormatter={shortDate} minTickGap={40} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS} width={40} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                    <Tooltip {...TT} formatter={(v) => [`${Number(v).toFixed(2)}%`, "Change from previous close"]} />
                    <Bar dataKey="return_pct" name="Change from previous close" isAnimationActive={false}>
                      {rows.map((r) => (
                        <Cell key={r.date} fill={r.return_pct > 0 ? "#15803d" : r.return_pct < 0 ? "#be123c" : "#a8a29e"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="border border-stone-200 p-4">
              <h3 className="font-serif font-bold text-base text-stone-900 mb-1 border-b border-stone-100 pb-1">
                How the tone of the news changed
              </h3>
              <p className="text-xs leading-relaxed text-stone-600">
                The line summarizes the wording in news found for each day: below 0 is more negative, 0 is neutral or mixed, and above 0 is more positive. It describes the news wording, not the stock.
              </p>
              <div className="h-56 mt-3" role="img" aria-label="News sentiment over time">
                {rows.some((r) => r.sentiment !== null) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rows} margin={M}>
                      <CartesianGrid stroke="#f5f5f4" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={AXIS} tickFormatter={shortDate} minTickGap={40} axisLine={false} tickLine={false} />
                      <YAxis domain={[-1, 1]} ticks={[-1, 0, 1]} tickFormatter={(v) => v === -1 ? "Negative" : v === 0 ? "Neutral" : "Positive"} tick={AXIS} width={58} axisLine={false} tickLine={false} />
                      <ReferenceLine y={0} stroke="#a8a29e" />
                      <Tooltip {...TT} formatter={(v) => [signed(v), "News tone (-1 to +1)"]} />
                      <Line dataKey="sentiment" name="News tone (-1 to +1)" stroke="#000000" strokeWidth={2} dot={{ r: 2.5, fill: "#000" }} connectNulls isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center px-6 text-center text-xs text-stone-500">
                  No analysed news was found for these dates. News coverage may be limited for older dates.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Returns compared with news sentiment */}
          <div className="border border-stone-200 p-5 space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900 border-b border-stone-100 pb-2">
              Did the news tone move alongside the share price?
            </h3>
            <p className="text-xs leading-relaxed text-stone-600 -mt-2">
              Bars show each day's price change (left scale); the black line shows news tone (right scale). Look for days when both moved in the same direction. This comparison does not mean one caused the other.
            </p>

            <div className="h-64" role="img" aria-label="Daily returns and news sentiment on the same dates">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rows} margin={{ ...M, right: 0 }}>
                  <CartesianGrid stroke="#f5f5f4" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={AXIS} tickFormatter={shortDate} minTickGap={40} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="r" tick={AXIS} width={44} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="s" orientation="right" domain={[-1, 1]} ticks={[-1, 0, 1]} tickFormatter={(v) => v === -1 ? "Negative" : v === 0 ? "Neutral" : "Positive"} tick={AXIS} width={58} axisLine={false} tickLine={false} />
                  <Tooltip {...TT} />
                  <Bar yAxisId="r" dataKey="return_pct" name="Share-price change (%)" fill="#78716c" fillOpacity={0.5} isAnimationActive={false} />
                  <Line yAxisId="s" dataKey="sentiment" name="News tone (-1 negative to +1 positive)" stroke="#000000" strokeWidth={2} dot={{ r: 2 }} connectNulls isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

          </div>
        </>
      )}

      {/* Model Performance */}
      <div className="border border-stone-900 p-5 bg-stone-50/20">
        <h3 className="font-serif font-black text-xl text-stone-950 mb-1 border-b border-stone-300 pb-2">
          How well did the forecast do on past data?
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-stone-600">
          FinSight checks the model against past trading days it was not trained on, then compares it with a simple guess. Past performance does not guarantee future results.
        </p>
        {pr.loading && !pr.data && <Spinner label="Training and evaluating candidate classifiers" />}
        {pr.error && <Unavailable what="Model evaluation" reason={pr.error.message} />}
        {pr.data && <ModelPerformance p={pr.data} />}
      </div>

      {/* Prediction History Table */}
      {an.data?.prediction_history?.length > 0 && (
        <div className="border border-stone-200 p-5">
          <h3 className="font-serif font-bold text-base text-stone-900 mb-1 border-b border-stone-100 pb-2">
            Forecasts FinSight made earlier
          </h3>
          <div className="overflow-x-auto mt-3">
            <table className="w-full min-w-[420px] text-left text-xs font-serif">
              <thead className="border-b border-black font-sans font-bold uppercase text-[10px] text-stone-600">
                <tr>
                  <th className="py-2">Made at</th>
                  <th>Time covered</th>
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
                  Topics appearing most often in the news
                </h3>
                <TopicBars items={nw.data.topics.topics} emptyText="No topics yet." />
          </div>
          <div className="border border-stone-200 p-4">
                <h3 className="font-serif font-bold text-base text-stone-900 mb-2 border-b border-stone-100 pb-1">
                  Companies and organisations mentioned most
                </h3>
                <TopicBars items={nw.data.topics.companies} color="#15803d" emptyText="No organisations recognised." />
          </div>
        </div>
      )}
    </div>
  );
}
