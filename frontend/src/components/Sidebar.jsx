import { NavLink } from "react-router-dom";
import { Activity, BookOpen, LayoutDashboard, LineChart, Newspaper, Star } from "lucide-react";

const ITEMS = [
  { to: (s) => (s ? `/stock/${s}` : "/"), label: "Dashboard", icon: LayoutDashboard, end: false, match: "/stock" },
  { to: (s) => (s ? `/news/${s}` : "/news"), label: "News", icon: Newspaper, match: "/news" },
  { to: (s) => (s ? `/analytics/${s}` : "/analytics"), label: "Analytics", icon: LineChart, match: "/analytics" },
  { to: () => "/watchlist", label: "Watchlist", icon: Star, match: "/watchlist" },
  { to: () => "/about", label: "Method", icon: BookOpen, match: "/about" },
];

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white shadow-xs">
        <Activity className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-900">FinSight</span>
    </div>
  );
}

export default function Sidebar({ symbol, health }) {
  const cls = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? "bg-slate-100 text-slate-900 font-semibold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    }`;
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-slate-200 bg-white p-4 md:flex" aria-label="Primary">
        <Logo />
        <nav className="mt-8 flex flex-col gap-1">
          {ITEMS.map((it) => (
            <NavLink key={it.label} to={it.to(symbol)} className={cls} end={it.end}>
              <it.icon className="h-4 w-4" aria-hidden /> {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          <p className="flex items-center gap-2 font-medium text-slate-700">
            <span className={`h-2 w-2 rounded-full ${health ? (health.demo_mode ? "bg-amber-500" : "bg-emerald-500") : "bg-rose-500"}`} />
            {health ? (health.demo_mode ? "Demo data mode" : "Live data") : "Server offline"}
          </p>
          {health && <p>Sentiment: {health.sentiment_backend}</p>}
          {health && !health.demo_mode && <p>News: {health.newsapi_configured ? "NewsAPI + free feeds" : "Free feeds"}</p>}
        </div>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Primary">
        {ITEMS.map((it) => (
          <NavLink
            key={it.label}
            to={it.to(symbol)}
            className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? "text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
          >
            <it.icon className="h-5 w-5" aria-hidden /> {it.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
