import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money, pct, shortDate, signed } from "../format.js";

const PERIODS = ["1mo", "3mo", "6mo", "1y", "2y", "5y"];
const AXIS = { fontSize: 10, fill: "#78716c", fontFamily: "sans-serif" };
const MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };
const Y_WIDTH = 56;

function PriceTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="border border-black bg-white px-3 py-2 text-xs shadow-none text-stone-900 font-sans">
      <p className="font-serif font-bold text-stone-950 text-xs border-b border-stone-200 pb-1">{p.date}</p>
      <p className="mt-1 text-stone-600">Close <span className="font-bold text-stone-950">{money(p.close, currency)}</span></p>
      {p.change_pct !== null && (
        <p className={`font-bold ${p.change_pct >= 0 ? "text-emerald-800" : "text-rose-800"}`}>
          Session {pct(p.change_pct)}
        </p>
      )}
      {p.sentiment !== null && p.sentiment !== undefined && (
        <p className="text-stone-500 font-serif italic">News tone <span className="font-sans font-bold text-stone-800">{signed(p.sentiment)}</span></p>
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
  const color = up ? "#15803d" : "#be123c";
  const tickGap = rows.length > 200 ? 70 : 40;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-sans">Period Performance</p>
          <p className={`font-serif font-bold text-lg ${up ? "text-emerald-800" : "text-rose-800"}`}>{pct(periodChange)}</p>
        </div>
        <div role="group" aria-label="Chart period" className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => onPeriod(p)}
              aria-pressed={p === period}
              className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors font-sans ${
                p === period ? "border border-black bg-black text-white" : "border border-stone-300 bg-white text-stone-600 hover:text-black hover:border-black"
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
                <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f5f5f4" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={AXIS} tickFormatter={shortDate} minTickGap={tickGap} axisLine={false} tickLine={false} />
            <YAxis
              domain={["auto", "auto"]}
              tick={AXIS}
              width={Y_WIDTH}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            />
            <Tooltip content={<PriceTooltip currency={currency} />} cursor={{ stroke: "#a8a29e", strokeDasharray: "3 3" }} />
            <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2} fill="url(#priceFill)" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500 font-sans border-t border-stone-100 pt-2">
        <span className="font-bold uppercase tracking-wider text-[10px]">News Sentiment per Trading Day</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><i className="h-2 w-2 bg-emerald-700" />positive</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 bg-rose-700" />negative</span>
        </span>
      </div>
      <div className="h-16" role="img" aria-label="Daily news sentiment strip aligned with the price chart">
        {hasSentiment ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ ...MARGIN, top: 2 }} syncId="price">
              <XAxis dataKey="date" hide />
              <YAxis domain={[-1, 1]} width={Y_WIDTH} tick={false} axisLine={false} tickLine={false} />
              <Tooltip content={() => null} cursor={{ fill: "rgba(120,113,108,0.1)" }} />
              <Bar dataKey="sentiment" isAnimationActive={false} minPointSize={2}>
                {rows.map((r) => (
                  <Cell
                    key={r.date}
                    fill={r.sentiment >= 0 ? "#15803d" : "#be123c"}
                    fillOpacity={0.6 + Math.min(Math.abs(r.sentiment ?? 0), 1) * 0.4}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center border border-dashed border-stone-200 bg-stone-50/50 px-3 text-xs text-stone-500 font-serif italic text-center">
            No analysed news falls inside this look-back window. Try 1M view for recent coverage.
          </p>
        )}
      </div>
    </div>
  );
}
