import { NavLink, useLocation } from "react-router-dom";
import { Activity, BookOpen, LayoutDashboard, LineChart, Newspaper, Star } from "lucide-react";

export const NAV_ITEMS = [
  { to: (s) => (s ? `/stock/${s}` : null), label: "Dashboard", end: true },
  { to: (s) => (s ? `/news/${s}` : "/news"), label: "Market News" },
  { to: (s) => (s ? `/analytics/${s}` : "/analytics"), label: "Analytics & Models" },
  { to: () => "/watchlist", label: "Watchlist" },
  { to: () => "/about", label: "Methodology" },
];

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="font-serif font-black tracking-tight text-xl text-stone-950">
        FinSight
      </span>
    </div>
  );
}

export default function Sidebar({ symbol, health }) {
  const { pathname } = useLocation();
  // Mobile bottom quick-navigation bar (hidden on desktop)
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-stone-300 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Mobile Navigation">
      {NAV_ITEMS.filter((it) => it.to(symbol) && !(it.label === "Dashboard" && pathname === "/")).map((it) => (
        <NavLink
          key={it.label}
          to={it.to(symbol)}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              isActive ? "text-black border-t-2 border-black -mt-[1px]" : "text-stone-500 hover:text-black"
            }`
          }
        >
          {it.label.split(" ")[0]}
        </NavLink>
      ))}
    </nav>
  );
}
