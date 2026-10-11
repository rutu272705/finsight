import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { api } from "../api.js";
import { useApi } from "../hooks/useApi.js";
import { shortDate, signed, dateTime } from "../format.js";
import { Card, EmptyState, ErrorState, Spinner, Unavailable, Disclaimer } from "../components/ui.jsx";
import ModelPerformance from "../components/ModelPerformance.jsx";
import TopicBars from "../components/TopicBars.jsx";

const AXIS = { fontSize: 11, fill: "#64748B" };
const TT = {
  contentStyle: { background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 8, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: 12 },
  labelStyle: { color: "#0F172A", fontWeight: 600 },
};
const M = { top: 8, right: 8, bottom: 0, left: 0 };
const POPULAR = ["AAPL", "TSLA", "NVDA", "RELIANCE.NS", "TCS.NS", "INFY.NS"];

function Corr({ c, label }) {
  if (!c) return <p className="text-xs text-slate-400">{label}: not enough overlapping days to compute.</p>;
  const a = Math.abs(c.r);
  const word = a < 0.2 ? "very weak" : a < 0.4 ? "weak" : a < 0.6 ? "moderate" : "strong";
  return (
    <p className="text-xs text-slate-600">
      {label}: r = <strong className="text-slate-900">{signed(c.r)}</strong> ({word}) over {c.n} days
    </p>
  );
}

function ScatterPanel({ rows, yKey, title }) {
  const pts = rows.filter((r) => r.sentiment !== null && r[yKey] !== null && r[yKey] !== undefined);
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="h-52" role="img" aria-label={`${title}: scatter of news sentiment against return`}>
        {pts.length < 3 ? (
          <p className="flex h-full items-center justify-center text-xs text-slate-400">Not enough points to plot.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={M}>
              <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
              <XAxis type="number" dataKey="sentiment" name="Sentiment" domain={[-1, 1]} tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis type="number" dataKey={yKey} name="Return %" tick={AXIS} width={40} axisLine={false} tickLine={false} />
              <ZAxis range={[40, 40]} />
              <ReferenceLine x={0} stroke="#CBD5E1" />
              <ReferenceLine y={0} stroke="#CBD5E1" />
              <Tooltip {...TT} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={pts} fill="#0284C7" fillOpacity={0.7} isAnimationActive={false} />
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
        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Or pick a popular company to start</p>
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR.map((s) => (
              <button
                key={s}
                type="button"
                className="btn font-semibold text-slate-800"
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{an.data?.profile?.name || sym} analytics</h1>
            <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800">{sym}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Compare news tone with price moves over matching dates.</p>
        </div>
        <div className="flex gap-2">
          <label className="text-xs font-medium text-slate-600">
            From
            <input
              type="date"
              className="input mt-1"
              value={range.start}
              max={range.end || undefined}
              onChange={(e) => setRange({ ...range, start: e.target.value })}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
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

      {an.loading && !an.data && <Spinner label="Building analytics" />}
      {an.error && <ErrorState error={an.error} onRetry={an.reload} />}
      {an.data && (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Daily price change" subtitle={`${an.data.range[0]} to ${an.data.range[1]}`}>
              <div className="h-56" role="img" aria-label="Daily percentage price change">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} margin={M}>
                    <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={AXIS} tickFormatter={shortDate} minTickGap={40} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS} width={40} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                    <Tooltip {...TT} formatter={(v) => `${Number(v).toFixed(2)}%`} />
                    <Bar dataKey="return_pct" name="Change" isAnimationActive={false}>
                      {rows.map((r) => (
                        <Cell key={r.date} fill={(r.return_pct ?? 0) >= 0 ? "#16A34A" : "#E11D48"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Sentiment over time" subtitle="Average article score per trading session (after-close news counts toward the next session)">
              <div className="h-56" role="img" aria-label="News sentiment over time">
                {rows.some((r) => r.sentiment !== null) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rows} margin={M}>
                      <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={AXIS} tickFormatter={shortDate} minTickGap={40} axisLine={false} tickLine={false} />
                      <YAxis domain={[-1, 1]} tick={AXIS} width={40} axisLine={false} tickLine={false} />
                      <ReferenceLine y={0} stroke="#CBD5E1" />
                      <Tooltip {...TT} formatter={(v) => signed(v)} />
                      <Line dataKey="sentiment" name="Sentiment" stroke="#0284C7" strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center px-6 text-center text-xs text-slate-400">
                    No analysed news in this date range. Free news sources cover only recent weeks.
                  </p>
                )}
              </div>
            </Card>
          </div>

          <Card title="Returns compared with news sentiment" subtitle="Bars: daily return (left axis). Line: news sentiment (right axis).">
            <div className="h-64" role="img" aria-label="Daily returns and news sentiment on the same dates">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rows} margin={{ ...M, right: 0 }}>
                  <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={AXIS} tickFormatter={shortDate} minTickGap={40} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="r" tick={AXIS} width={40} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="s" orientation="right" domain={[-1, 1]} tick={AXIS} width={34} axisLine={false} tickLine={false} />
                  <Tooltip {...TT} />
                  <Bar yAxisId="r" dataKey="return_pct" name="Return %" fill="#94A3B8" fillOpacity={0.6} isAnimationActive={false} />
                  <Line yAxisId="s" dataKey="sentiment" name="Sentiment" stroke="#0284C7" strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid gap-5 md:grid-cols-2 border-t border-slate-100 pt-4">
              <ScatterPanel rows={withNext} yKey="return_pct" title="Sentiment vs same-session return" />
              <ScatterPanel rows={withNext} yKey="next_return_pct" title="Sentiment vs next-session return" />
            </div>
            <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
              <Corr c={an.data.correlation.same_session} label="Same session" />
              <Corr c={an.data.correlation.next_session} label="Next session" />
              <Disclaimer>{an.data.correlation.note}</Disclaimer>
            </div>
          </Card>
        </>
      )}

      <Card title="Trend model evaluation" subtitle="Compared on days the model never saw during training">
        {pr.loading && !pr.data && <Spinner label="Training and evaluating the model (first run can take a few seconds)" />}
        {pr.error && <Unavailable what="Model evaluation" reason={pr.error.message} />}
        {pr.data && <ModelPerformance p={pr.data} />}
      </Card>

      {an.data?.prediction_history?.length > 0 && (
        <Card title="Past forecasts made by FinSight" subtitle="Stored each time a dashboard is opened">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-xs font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2">Made at</th>
                  <th>Horizon</th>
                  <th>Forecast</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {an.data.prediction_history.slice(0, 10).map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-2 text-slate-600">{dateTime(p.predicted_at)}</td>
                    <td className="text-slate-600">{p.horizon_days} sessions</td>
                    <td className="font-semibold text-slate-900">{p.label}</td>
                    <td className="text-slate-600">
                      {p.confidence != null ? (p.confidence > 0.99 ? ">99%" : `${(p.confidence * 100).toFixed(0)}%`) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {nw.data && (
        <div className="grid gap-5 md:grid-cols-2">
          <Card title="Frequent financial topics">
            <TopicBars items={nw.data.topics.topics} emptyText="No topics yet." />
          </Card>
          <Card title="Frequently mentioned organisations">
            <TopicBars items={nw.data.topics.companies} color="#16A34A" emptyText="No organisations recognised." />
          </Card>
        </div>
      )}
    </div>
  );
}
