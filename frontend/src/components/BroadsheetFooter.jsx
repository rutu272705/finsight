import { useState } from "react";
import { Link } from "react-router-dom";

export default function BroadsheetFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
    }
  };

  return (
    <footer className="mt-16 border-t-2 border-black bg-white pt-10 pb-16 text-stone-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Newsletter Signup (Referenced from the Newspaper image) */}
        <div className="mb-12 border-b border-stone-200 pb-10 text-center">
          <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
            Sign up for the FinSight Market Sentiment Dispatch
          </h3>
          <p className="mt-1 text-xs text-stone-600">
            Get daily NLP sentiment summaries and experimental predictive forecasts delivered every morning.
          </p>
          {subscribed ? (
            <p className="mt-4 font-serif italic text-sm text-stone-900">Thank you for subscribing to the morning dispatch.</p>
          ) : (
            <form onSubmit={handleSubscribe} className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2">
              <input
                type="email"
                placeholder="Your email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input text-xs"
              />
              <button type="submit" className="btn btn-primary whitespace-nowrap">
                Sign Up
              </button>
            </form>
          )}
        </div>

        {/* 4 Column Editorial Directory */}
        <div className="grid grid-cols-2 gap-8 border-b border-stone-200 pb-10 sm:grid-cols-4 text-xs">
          <div>
            <h4 className="font-serif font-black uppercase tracking-wider text-stone-900 mb-3 text-sm">
              FinSight
            </h4>
            <p className="text-stone-600 leading-relaxed mb-3">
              Independent natural language processing system analysing corporate news, sentiment trends, and price movements.
            </p>
            <p className="text-stone-500 font-serif italic">Not financial advice.</p>
          </div>

          <div>
            <h4 className="font-serif font-bold uppercase tracking-wider text-stone-900 mb-3">
              Market Coverage
            </h4>
            <ul className="space-y-2 text-stone-600">
              <li><Link to="/stock/AAPL" className="hover:text-black">Apple Inc. (AAPL)</Link></li>
              <li><Link to="/stock/TSLA" className="hover:text-black">Tesla, Inc. (TSLA)</Link></li>
              <li><Link to="/stock/NVDA" className="hover:text-black">NVIDIA Corp. (NVDA)</Link></li>
              <li><Link to="/stock/RELIANCE.NS" className="hover:text-black">Reliance Industries (NSE)</Link></li>
              <li><Link to="/stock/TCS.NS" className="hover:text-black">Tata Consultancy (NSE)</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-bold uppercase tracking-wider text-stone-900 mb-3">
              NLP & Analytics
            </h4>
            <ul className="space-y-2 text-stone-600">
              <li><Link to="/news" className="hover:text-black">Financial News Wire</Link></li>
              <li><Link to="/analytics" className="hover:text-black">Correlation & Scatter Plots</Link></li>
              <li><Link to="/analytics" className="hover:text-black">Model Evaluation</Link></li>
              <li><Link to="/watchlist" className="hover:text-black">Personal Watchlist</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-bold uppercase tracking-wider text-stone-900 mb-3">
              Editorial & Method
            </h4>
            <ul className="space-y-2 text-stone-600">
              <li><Link to="/about" className="hover:text-black">Pipeline Architecture</Link></li>
              <li><Link to="/about" className="hover:text-black">Lexicon & FinBERT Models</Link></li>
              <li><Link to="/about" className="hover:text-black">Walk-Forward Backtesting</Link></li>
              <li><Link to="/about" className="hover:text-black">System Limitations</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Broadsheet Signature */}
        <div className="pt-6 text-center text-[11px] text-stone-500">
          <p className="font-serif italic">FinSight © 2026 | All Rights Reserved</p>
        </div>
      </div>
    </footer>
  );
}
