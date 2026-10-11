import { useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api.js";
import Sidebar, { Logo } from "./components/Sidebar.jsx";
import SearchBar from "./components/SearchBar.jsx";
import { DemoBanner } from "./components/ui.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import News from "./pages/News.jsx";
import Analytics from "./pages/Analytics.jsx";
import Watchlist from "./pages/Watchlist.jsx";
import About from "./pages/About.jsx";

const SECTIONS = ["stock", "news", "analytics"];

export default function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [health, setHealth] = useState(null);
  const [lastSymbol, setLastSymbol] = useState(() => {
    try {
      return localStorage.getItem("finsight:last") || "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    const ctrl = new AbortController();
    api.health(ctrl.signal).then(setHealth).catch(() => setHealth(null));
    return () => ctrl.abort();
  }, []);

  const [section, routeSymbol] = pathname.split("/").filter(Boolean);
  useEffect(() => {
    if (SECTIONS.includes(section) && routeSymbol) {
      const s = decodeURIComponent(routeSymbol).toUpperCase();
      setLastSymbol(s);
      try {
        localStorage.setItem("finsight:last", s);
      } catch {
        /* storage unavailable */
      }
    }
  }, [section, routeSymbol]);

  const go = (sym) => navigate(`/${SECTIONS.includes(section) ? section : "stock"}/${encodeURIComponent(sym)}`);

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <Sidebar symbol={lastSymbol} health={health} />
      <div className="md:pl-56">
        {health?.demo_mode && <DemoBanner />}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="md:hidden">
            <Logo />
          </div>
          <div className="mx-auto w-full max-w-xl md:mx-0">
            <SearchBar onSelect={go} />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:pb-12">
          <Routes>
            <Route path="/" element={<Dashboard onPick={go} />} />
            <Route path="/stock/:symbol" element={<Dashboard onPick={go} />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:symbol" element={<News />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/analytics/:symbol" element={<Analytics />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Dashboard onPick={go} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
