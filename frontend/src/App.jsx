import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api.js";
import BroadsheetHeader from "./components/BroadsheetHeader.jsx";
import BroadsheetFooter from "./components/BroadsheetFooter.jsx";
import Sidebar from "./components/Sidebar.jsx";
import BackToTop from "./components/BackToTop.jsx";
import { DemoBanner } from "./components/ui.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const News = lazy(() => import("./pages/News.jsx"));
const Analytics = lazy(() => import("./pages/Analytics.jsx"));
const Watchlist = lazy(() => import("./pages/Watchlist.jsx"));
const About = lazy(() => import("./pages/About.jsx"));

const SECTIONS = ["stock", "news", "analytics"];

export default function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api.health(ctrl.signal).then(setHealth).catch(() => setHealth(null));
    return () => ctrl.abort();
  }, []);

  const [section, routeSymbol] = pathname.split("/").filter(Boolean);
  const activeSymbol = SECTIONS.includes(section) && routeSymbol
    ? decodeURIComponent(routeSymbol).toUpperCase()
    : "";

  const go = (sym) => navigate(`/${SECTIONS.includes(section) ? section : "stock"}/${encodeURIComponent(sym)}`);

  return (
    <div className="min-h-full bg-white text-stone-900 flex flex-col">
      {health?.demo_mode && <DemoBanner />}
      <BroadsheetHeader symbol={activeSymbol} health={health} onSelect={go} />
      
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 md:py-8">
        <Suspense fallback={<div role="status" className="flex min-h-[40vh] items-center justify-center text-xs text-stone-500">Loading section...</div>}>
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
        </Suspense>
      </main>

      <BroadsheetFooter />
      {/* Mobile navigation bar */}
      <Sidebar symbol={activeSymbol} health={health} />
      <BackToTop />
    </div>
  );
}
