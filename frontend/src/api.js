// Thin client for the Flask API. The browser only ever talks to /api; secrets live on the server.
export class ApiError extends Error {
  constructor(message, { code = "error", status = 0, details = {} } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = "GET", body, signal } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError("Cannot reach the FinSight server. Make sure the backend is running on port 5000.", { code: "network" });
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const e = json?.error;
    throw new ApiError(e?.message || `The server returned an error (HTTP ${res.status}).`, {
      code: e?.code || "error",
      status: res.status,
      details: e?.details || {},
    });
  }
  return json;
}

const qs = (params = {}) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && v !== "" && v !== false && p.set(k, v));
  const s = p.toString();
  return s ? `?${s}` : "";
};
const enc = encodeURIComponent;

export const api = {
  health: (signal) => request("/health", { signal }),
  search: (q, signal) => request(`/search${qs({ q })}`, { signal }),
  stock: (sym, period, signal) => request(`/stock/${enc(sym)}${qs({ period })}`, { signal }),
  dashboard: (sym, params, signal) => request(`/dashboard/${enc(sym)}${qs(params)}`, { signal }),
  news: (sym, params, signal) => request(`/news/${enc(sym)}${qs(params)}`, { signal }),
  analyze: (body) => request("/analyze", { method: "POST", body }),
  prediction: (sym, params, signal) => request(`/prediction/${enc(sym)}${qs(params)}`, { signal }),
  analytics: (sym, params, signal) => request(`/analytics/${enc(sym)}${qs(params)}`, { signal }),
  watchlist: (signal) => request("/watchlist", { signal }),
  addWatch: (symbol, name) => request("/watchlist", { method: "POST", body: { symbol, name } }),
  removeWatch: (sym) => request(`/watchlist/${enc(sym)}`, { method: "DELETE" }),
  history: (signal) => request("/history", { signal }),
  clearHistory: () => request("/history", { method: "DELETE" }),
  exportUrl: (sym, type = "articles") => `/api/export/${enc(sym)}${qs({ type })}`,
};
