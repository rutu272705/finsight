import { useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api.js";
import BroadsheetHeader from "./components/BroadsheetHeader.jsx";
import BroadsheetFooter from "./components/BroadsheetFooter.jsx";
import Sidebar from "./components/Sidebar.jsx";
import BackToTop from "./components/BackToTop.jsx";
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
    <div className="min-h-full bg-white text-stone-900 flex flex-col">
      {health?.demo_mode && <DemoBanner />}
      <BroadsheetHeader symbol={lastSymbol} health={health} onSelect={go} />
      
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 md:py-8">
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

      <BroadsheetFooter />
      {/* Mobile navigation bar */}
      <Sidebar symbol={lastSymbol} health={health} />
      <BackToTop />
    </div>
  );
}
