import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { House } from "lucide-react";
import SearchBar from "./SearchBar.jsx";
import { NAV_ITEMS } from "./Sidebar.jsx";
import { api } from "../api.js";
import { changeColor, money, pct } from "../format.js";

const TICKER_RIBBON = [
  { sym: "AAPL", name: "Apple" },
  { sym: "NVDA", name: "NVIDIA" },
  { sym: "TSLA", name: "Tesla" },
  { sym: "RELIANCE.NS", name: "Reliance" },
  { sym: "TCS.NS", name: "TCS" },
  { sym: "INFY.NS", name: "Infosys" },
];

export default function BroadsheetHeader({ symbol, health, onSelect }) {
  const { pathname } = useLocation();
  const [currentDate, setCurrentDate] = useState("");
  const [quotes, setQuotes] = useState({});

  useEffect(() => {
    const now = new Date();
    const formatted = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    setCurrentDate(formatted);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(
      TICKER_RIBBON.map(async ({ sym }) => {
        try {
          const response = await api.stock(sym, "1mo", controller.signal);
          return [sym, response.data];
        } catch (error) {
          if (error.name !== "AbortError") {
            return [sym, null];
          }
          return [sym, null];
        }
      }),
    ).then((results) => {
      if (!controller.signal.aborted) {
        setQuotes(Object.fromEntries(results));
      }
    });
    return () => controller.abort();
  }, []);

  return (
    <header className="border-b border-stone-200 bg-white">
      {/* Top Utility Bar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between border-b border-stone-200 py-1.5 text-[11px] font-medium text-stone-600">
          <div className="flex items-center gap-3">
            <span className="font-serif italic text-stone-900">{currentDate || "Monday, October 11, 2026"}</span>
            <span className="hidden text-stone-300 sm:inline">|</span>
            <span className="hidden uppercase tracking-widest text-stone-500 sm:inline">Daily Financial Edition</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  health ? (health.demo_mode ? "bg-amber-500" : "bg-emerald-600") : "bg-rose-500"
                }`}
              />
              <span className="font-semibold uppercase tracking-wider text-stone-800 text-[10px]">
                {health ? (health.demo_mode ? "Demo Data Mode" : "Live Market Feed") : "Server Offline"}
              </span>
            </div>
            {health && (
              <span className="hidden text-stone-500 md:inline">
                Model: <strong className="text-stone-800 uppercase">{health.sentiment_backend}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Grand Broadsheet Masthead */}
        <div className="py-5 text-center sm:py-7">
          <Link to="/" className="inline-block group">
            <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-stone-950 transition-colors group-hover:text-stone-800">
              FinSight
            </h1>
          </Link>
        </div>
      </div>

      {/* Quick Financial Ticker Ribbon (Market pulse for instant one-click stock viewing) */}
      <div className="border-t border-b border-stone-200 bg-stone-50/70 py-2 text-xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-6">
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-stone-400 shrink-0">
            Quick Picks:
          </span>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
            {TICKER_RIBBON.map((t) => (
              <button
                key={t.sym}
                type="button"
                onClick={() => onSelect(t.sym)}
                className="flex min-w-0 items-center gap-x-1.5 rounded-sm border border-stone-200 bg-white px-2 py-1 hover:border-stone-400 hover:text-black group transition-colors"
                title={`Open ${t.name} (${t.sym})`}
              >
                <span className="font-serif font-bold text-stone-900 group-hover:underline">{t.name}</span>
                <span className="font-sans text-[10px] text-stone-500">{t.sym}</span>
                <span className="font-sans text-stone-700" aria-label={`${t.name} latest price`}>
                  {money(quotes[t.sym]?.quote?.price, quotes[t.sym]?.profile?.currency)}
                </span>
                <span
                  className={`font-sans text-[11px] font-bold ${changeColor(quotes[t.sym]?.quote?.change_pct)}`}
                  aria-label={`${t.name} daily percentage change`}
                >
                  {pct(quotes[t.sym]?.quote?.change_pct)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Double-Line Category Navigation Bar with Search */}
      <div className="sticky top-0 z-30 border-b-2 border-black bg-white/95 backdrop-blur shadow-2xs">
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
            <nav aria-label="Main Navigation" className="flex flex-wrap items-center justify-center gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1 text-xs font-semibold text-stone-700 md:justify-start lg:flex-nowrap">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
                    isActive ? "bg-stone-950 text-white shadow-sm" : "text-stone-600 hover:bg-white hover:text-stone-950"
                  }`
                }
              >
                <House className="h-4 w-4" aria-hidden="true" />
                Home
              </NavLink>
              {NAV_ITEMS.filter((it) => it.to(symbol) && !(it.label === "Dashboard" && pathname === "/")).map((it) => (
                <NavLink
                  key={it.label}
                  to={it.to(symbol)}
                  end={it.end}
                  className={({ isActive }) =>
                    `inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
                      isActive ? "bg-stone-950 text-white shadow-sm" : "text-stone-600 hover:bg-white hover:text-stone-950"
                    }`
                  }
                >
                  <it.icon className="h-4 w-4" aria-hidden="true" />
                  {it.label}
                </NavLink>
              ))}
            </nav>

            <div className="grid w-full gap-1.5 border-t border-stone-200 pt-2.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-3 lg:max-w-md lg:flex-1 lg:grid-cols-[auto_minmax(0,1fr)] lg:border-0 lg:pt-0">
              <p className="whitespace-nowrap text-xs font-bold text-stone-700">
                Search stocks:
                <span className="sr-only"> company name or ticker</span>
              </p>
              <SearchBar
                onSelect={onSelect}
                label="Search stocks by company name or ticker"
                placeholder="Try Apple, AAPL, or TCS.NS"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
