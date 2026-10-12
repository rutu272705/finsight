import { NavLink, useLocation } from "react-router-dom";
import { Activity, BookOpen, LayoutDashboard, Newspaper, Star } from "lucide-react";

export const NAV_ITEMS = [
  { to: (s) => (s ? `/stock/${s}` : null), label: "Dashboard", end: true, icon: LayoutDashboard },
  { to: (s) => (s ? `/news/${s}` : "/news"), label: "Market News", icon: Newspaper },
  { to: (s) => (s ? `/analytics/${s}` : "/analytics"), label: "Analytics", icon: Activity },
  { to: () => "/watchlist", label: "Watchlist", icon: Star },
  { to: () => "/about", label: "Methodology", icon: BookOpen },
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
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur md:hidden" aria-label="Mobile Navigation">
      {NAV_ITEMS.filter((it) => it.to(symbol) && !(it.label === "Dashboard" && pathname === "/")).map((it) => (
        <NavLink
          key={it.label}
          to={it.to(symbol)}
          end={it.end}
          className={({ isActive }) =>
            `relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 py-2 text-[9px] font-semibold leading-none transition-colors ${
              isActive ? "text-stone-950" : "text-stone-500 hover:text-stone-900"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <it.icon className={`h-4 w-4 ${isActive ? "text-stone-950" : "text-stone-500"}`} aria-hidden="true" />
              <span className="text-center">{it.label}</span>
              {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-stone-950" aria-hidden="true" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
