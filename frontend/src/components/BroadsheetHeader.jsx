import { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { TrendingUp, TrendingDown, Search } from "lucide-react";
import SearchBar from "./SearchBar.jsx";
import { NAV_ITEMS } from "./Sidebar.jsx";

const TICKER_RIBBON = [
  { sym: "AAPL", name: "Apple", price: "$129.00", chg: "+0.78%", up: true },
  { sym: "NVDA", name: "NVIDIA", price: "$124.50", chg: "+2.14%", up: true },
  { sym: "TSLA", name: "Tesla", price: "$248.80", chg: "-0.80%", up: false },
  { sym: "RELIANCE.NS", name: "Reliance", price: "₹2,945", chg: "+0.45%", up: true },
  { sym: "TCS.NS", name: "TCS", price: "₹4,215", chg: "-0.22%", up: false },
  { sym: "INFY.NS", name: "Infosys", price: "₹1,890", chg: "+1.10%", up: true },
];

export default function BroadsheetHeader({ symbol, health, onSelect }) {
  const [currentDate, setCurrentDate] = useState("");

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
              The FinSight Chronicle
            </h1>
          </Link>
          <div className="mt-2 flex items-center justify-center gap-3 text-[10px] sm:text-xs font-serif italic text-stone-600">
            <span className="hidden h-[1px] w-12 bg-stone-300 sm:inline-block" />
            <span className="uppercase tracking-widest font-sans font-bold text-stone-500 text-[10px]">
              Financial News Sentiment · Natural Language Processing · 5-Session Trend Forecasts
            </span>
            <span className="hidden h-[1px] w-12 bg-stone-300 sm:inline-block" />
          </div>
        </div>
      </div>

      {/* Quick Financial Ticker Ribbon (Market pulse for instant one-click stock viewing) */}
      <div className="border-t border-b border-stone-200 bg-stone-50/70 py-1.5 overflow-x-auto scrollbar-none text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center gap-6 whitespace-nowrap">
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-stone-400 shrink-0">
            Market Pulse:
          </span>
          <div className="flex items-center gap-6 divide-x divide-stone-200">
            {TICKER_RIBBON.map((t) => (
              <button
                key={t.sym}
                type="button"
                onClick={() => onSelect(t.sym)}
                className="flex items-center gap-2 pl-4 first:pl-0 hover:text-black group transition-colors"
                title={`Open ${t.name} (${t.sym})`}
              >
                <span className="font-serif font-bold text-stone-900 group-hover:underline">{t.sym}</span>
                <span className="font-sans text-stone-600">{t.price}</span>
                <span className={`inline-flex items-center text-[11px] font-bold ${t.up ? "text-emerald-700" : "text-rose-700"}`}>
                  {t.up ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {t.chg}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Double-Line Category Navigation Bar with Search */}
      <div className="sticky top-0 z-30 border-b-2 border-black bg-white/95 backdrop-blur shadow-2xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2.5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-wider text-stone-800 md:justify-start">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `transition-colors hover:text-black py-1 border-b-2 ${
                    isActive ? "border-black text-black" : "border-transparent text-stone-600"
                  }`
                }
              >
                Home
              </NavLink>
              {NAV_ITEMS.map((it) => (
                <NavLink
                  key={it.label}
                  to={it.to(symbol)}
                  end={it.end}
                  className={({ isActive }) =>
                    `transition-colors hover:text-black py-1 border-b-2 ${
                      isActive ? "border-black text-black" : "border-transparent text-stone-600"
                    }`
                  }
                >
                  {it.label}
                </NavLink>
              ))}
            </nav>

            <div className="w-full md:w-80">
              <SearchBar onSelect={onSelect} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
