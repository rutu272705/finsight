const CURRENCY_SYMBOL = { USD: "$", INR: "₹", GBP: "£", EUR: "€", JPY: "¥" };

export function money(value, currency) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sym = CURRENCY_SYMBOL[currency] || (currency ? `${currency} ` : "");
  return `${sym}${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function pct(value, digits = 2, signed = true) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const v = Number(value);
  return `${signed && v > 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

export function signed(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const v = Number(value);
  return `${v > 0 ? "+" : ""}${v.toFixed(digits)}`;
}

export function compact(n) {
  if (n === null || n === undefined) return "—";
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function dateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function shortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function timeAgo(iso) {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export const SENTIMENT = {
  positive: { label: "Positive", text: "text-gain", bg: "bg-emerald-50", border: "border-emerald-200", hex: "#16A34A" },
  negative: { label: "Negative", text: "text-loss", bg: "bg-rose-50", border: "border-rose-200", hex: "#E11D48" },
  neutral: { label: "Neutral", text: "text-flat", bg: "bg-slate-100", border: "border-slate-200", hex: "#64748B" },
};
export const TREND = {
  Upward: { text: "text-gain", hex: "#16A34A" },
  Downward: { text: "text-loss", hex: "#E11D48" },
  Stable: { text: "text-flat", hex: "#64748B" },
};
export const changeColor = (v) => (v > 0 ? "text-gain" : v < 0 ? "text-loss" : "text-flat");
