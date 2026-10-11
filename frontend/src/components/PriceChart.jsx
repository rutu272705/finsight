import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money, pct, shortDate, signed } from "../format.js";

const PERIODS = ["1mo", "3mo", "6mo", "1y", "2y", "5y"];
const AXIS = { fontSize: 11, fill: "#64748B" };
const MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };
const Y_WIDTH = 56;

function PriceTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-lg text-slate-900">
      <p className="font-semibold text-slate-900">{p.date}</p>
      <p className="mt-0.5 text-slate-600">Close <span className="font-medium text-slate-900">{money(p.close, currency)}</span></p>
      {p.change_pct !== null && (
        <p className={`font-medium ${p.change_pct >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
          Day {pct(p.change_pct)}
        </p>
      )}
      {p.sentiment !== null && p.sentiment !== undefined && (
        <p className="text-slate-500">News tone <span className="font-medium text-slate-700">{signed(p.sentiment)}</span></p>
      )}
    </div>
  );
}

/**
 * Price line with a sentiment strip underneath. Both charts share margins and axis widths so each
 * news-tone bar sits directly beneath the trading day it belongs to.
 */
export default function PriceChart({ history, sentimentDaily, period, onPeriod, currency }) {
  const rows = useMemo(() => {
    const byDate = new Map((sentimentDaily || []).map((s) => [s.date, s.score]));
    return history.map((h) => ({ ...h, sentiment: byDate.has(h.date) ? byDate.get(h.date) : null }));
  }, [history, sentimentDaily]);
  const hasSentiment = rows.some((r) => r.sentiment !== null);
  const first = rows[0]?.close;
  const last = rows[rows.length - 1]?.close;
  const periodChange = first ? ((last - first) / first) * 100 : null;
  const up = periodChange === null || periodChange >= 0;
  const color = up ? "#16A34A" : "#E11D48";
  const tickGap = rows.length > 200 ? 70 : 40;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500">Change over selected period</p>
          <p className={`text-lg font-semibold ${up ? "text-emerald-700" : "text-rose-700"}`}>{pct(periodChange)}</p>
        </div>
        <div role="group" aria-label="Chart period" className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => onPeriod(p)}
              aria-pressed={p === period}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                p === period ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 sm:h-72" role="img" aria-label={`Closing price chart for the last ${period}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={MARGIN} syncId="price">
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={color} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={AXIS} tickFormatter={shortDate} minTickGap={tickGap} axisLine={false} tickLine={false} />
            <YAxis
              domain={["auto", "auto"]}
              tick={AXIS}
              width={Y_WIDTH}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            />
            <Tooltip content={<PriceTooltip currency={currency} />} cursor={{ stroke: "#CBD5E1", strokeDasharray: "3 3" }} />
            <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2} fill="url(#priceFill)" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>News tone by trading day</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-emerald-600" />positive</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-rose-600" />negative</span>
        </span>
      </div>
      <div className="h-16" role="img" aria-label="Daily news sentiment strip aligned with the price chart">
        {hasSentiment ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ ...MARGIN, top: 2 }} syncId="price">
              <XAxis dataKey="date" hide />
              <YAxis domain={[-1, 1]} width={Y_WIDTH} tick={false} axisLine={false} tickLine={false} />
              <Tooltip content={() => null} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
              <Bar dataKey="sentiment" isAnimationActive={false} radius={[2, 2, 2, 2]} minPointSize={2}>
                {rows.map((r) => (
                  <Cell
                    key={r.date}
                    fill={r.sentiment >= 0 ? "#16A34A" : "#E11D48"}
                    fillOpacity={0.6 + Math.min(Math.abs(r.sentiment ?? 0), 1) * 0.4}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 text-xs text-slate-500">
            No analysed news falls inside this period, so there is no sentiment to show. News APIs usually cover only the last few weeks; try the 1M view.
          </p>
        )}
      </div>
    </div>
  );
}
