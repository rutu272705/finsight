import { AlertTriangle, Inbox, Loader2, RefreshCw, FlaskConical, Info } from "lucide-react";

export function Card({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`border border-stone-200 bg-white p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3 border-b border-stone-100 pb-2">
          <div>
            {title && <h2 className="font-serif font-bold text-base text-stone-900 tracking-tight">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Spinner({ label = "Loading" }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 py-8 text-sm text-stone-600 justify-center">
      <Loader2 className="h-4 w-4 animate-spin text-stone-900" aria-hidden />
      <span className="font-serif italic">{label}…</span>
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading dashboard" className="space-y-6">
      <Skeleton className="h-28" />
      <div className="grid gap-6 lg:grid-cols-12">
        <Skeleton className="h-[420px] lg:col-span-8" />
        <Skeleton className="h-[420px] lg:col-span-4" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "Something went wrong" }) {
  const network = error?.code === "network";
  const heading = network ? "Can't reach the server" : error?.status === 404 ? "Nothing found" : error?.code === "rate_limited" ? "Slow down a moment" : title;
  return (
    <div role="alert" className="border border-rose-300 bg-rose-50/20 p-5 flex flex-col items-start gap-3">
      <div className="flex items-center gap-2 text-rose-800">
        <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
        <h2 className="font-serif font-bold text-base">{heading}</h2>
      </div>
      <p className="max-w-prose text-sm text-stone-700 leading-relaxed">{error?.message || "An unexpected error occurred."}</p>
      {onRetry && error?.code !== "validation_error" && (
        <button className="btn" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-2.5 border border-stone-200 bg-stone-50/40 p-8 sm:p-12 text-center">
      <Inbox className="h-7 w-7 text-stone-400" aria-hidden />
      <h3 className="font-serif font-bold text-lg text-stone-900">{title}</h3>
      {children && <div className="max-w-md text-sm text-stone-600 leading-relaxed">{children}</div>}
      {action}
    </div>
  );
}

/** Inline notice for one dashboard section whose data source failed. Shown instead of fabricated numbers. */
export function Unavailable({ what, reason }) {
  return (
    <div role="status" className="flex gap-3 border border-amber-300 bg-amber-50/50 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
      <div>
        <p className="font-serif font-bold text-amber-950">{what} unavailable</p>
        <p className="mt-0.5 text-stone-700">{reason}</p>
      </div>
    </div>
  );
}

export function DemoBanner() {
  return (
    <div role="note" className="flex items-center justify-center gap-2 border-b border-stone-300 bg-stone-100 px-4 py-2 text-xs text-stone-800">
      <FlaskConical className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
      <span>
        <strong>Broadsheet Demo Mode:</strong> Prices and headlines are synthetic sample data for offline demonstration, not real market information.
      </span>
    </div>
  );
}

export function Disclaimer({ children }) {
  return (
    <p className="flex items-start gap-2 text-xs text-stone-500 font-serif italic border-t border-stone-200 pt-3">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400 not-italic" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function SentimentBadge({ label }) {
  const map = {
    positive: "border-emerald-700 bg-emerald-50 text-emerald-800",
    negative: "border-rose-700 bg-rose-50 text-rose-800",
    neutral: "border-stone-400 bg-stone-100 text-stone-800",
  };
  const text = { positive: "Positive", negative: "Negative", neutral: "Neutral" };
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[label] || map.neutral}`}>
      {text[label] || "—"}
    </span>
  );
}
