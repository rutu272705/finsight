import { AlertTriangle, Inbox, Loader2, RefreshCw, FlaskConical, Info } from "lucide-react";

export function Card({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`panel p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
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
    <div role="status" aria-live="polite" className="flex items-center gap-2 py-6 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin text-slate-900" aria-hidden />
      <span>{label}…</span>
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div aria-hidden className={`skeleton rounded-lg ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading dashboard" className="space-y-4">
      <Skeleton className="h-24" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[380px] lg:col-span-2" />
        <Skeleton className="h-[380px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
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
    <div role="alert" className="panel flex flex-col items-start gap-3 border-rose-200 bg-rose-50/30 p-5">
      <div className="flex items-center gap-2 text-rose-700">
        <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
        <h2 className="text-sm font-semibold">{heading}</h2>
      </div>
      <p className="max-w-prose text-sm text-slate-600">{error?.message || "An unexpected error occurred."}</p>
      {onRetry && error?.code !== "validation_error" && (
        <button className="btn" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-xs">
      <Inbox className="h-7 w-7 text-slate-400" aria-hidden />
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {children && <div className="max-w-md text-sm text-slate-500">{children}</div>}
      {action}
    </div>
  );
}

/** Inline notice for one dashboard section whose data source failed. Shown instead of fabricated numbers. */
export function Unavailable({ what, reason }) {
  return (
    <div role="status" className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
      <div>
        <p className="font-semibold text-amber-900">{what} unavailable</p>
        <p className="mt-0.5 text-slate-600">{reason}</p>
      </div>
    </div>
  );
}

export function DemoBanner() {
  return (
    <div role="note" className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
      <FlaskConical className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
      <span>
        <strong>Demo mode:</strong> prices and headlines are synthetic sample data for offline demonstration, not real market information.
      </span>
    </div>
  );
}

export function Disclaimer({ children }) {
  return (
    <p className="flex items-start gap-2 text-xs text-slate-500">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function SentimentBadge({ label }) {
  const map = {
    positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
    negative: "border-rose-200 bg-rose-50 text-rose-700",
    neutral: "border-slate-200 bg-slate-100 text-slate-700",
  };
  const text = { positive: "Positive", negative: "Negative", neutral: "Neutral" };
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${map[label] || map.neutral}`}>{text[label] || "—"}</span>;
}
