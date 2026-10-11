import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "../api.js";
import Dashboard from "../pages/Dashboard.jsx";
import News from "../pages/News.jsx";
import Watchlist from "../pages/Watchlist.jsx";
import ArticleCard from "../components/ArticleCard.jsx";
import PredictionCard from "../components/PredictionCard.jsx";
import SearchBar from "../components/SearchBar.jsx";
import { article, dashboard } from "./fixtures.js";

vi.mock("../api.js", async (orig) => {
  const actual = await orig();
  const fn = () => vi.fn();
  return { ...actual, api: { health: fn(), search: fn(), dashboard: fn(), news: fn(), watchlist: fn(), history: fn(), addWatch: fn(), removeWatch: fn(), clearHistory: fn(), prediction: fn(), analytics: fn(), exportUrl: (s, t) => `/api/export/${s}?type=${t}` } };
});

const at = (path, ui, route = "/stock/:symbol") =>
  render(<MemoryRouter initialEntries={[path]}><Routes><Route path={route} element={ui} /></Routes></MemoryRouter>);
const ok = (data, extra = {}) => Promise.resolve({ data, demo: false, warnings: [], ...extra });

beforeEach(() => { vi.clearAllMocks(); api.history.mockReturnValue(ok([])); });

describe("Dashboard", () => {
  it("shows a loading state, then the company, price, sentiment and forecast", async () => {
    api.dashboard.mockReturnValue(ok(dashboard()));
    at("/stock/AAPL", <Dashboard onPick={() => {}} />);
    expect(screen.getByRole("status", { name: /loading dashboard/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Apple Inc." })).toBeInTheDocument();
    expect(screen.getByLabelText("Latest price")).toHaveTextContent("$129.00");
    expect(screen.getByText(/next 5 trading sessions/i)).toBeInTheDocument();
    expect(screen.getAllByText("Upward").length).toBeGreaterThan(0);
    expect(screen.getByText(/not financial advice/i, { selector: "div" })).toBeInTheDocument();
    expect(screen.getByText("+0.40")).toBeInTheDocument();
  });

  it("shows a clear error with retry when the API fails", async () => {
    api.dashboard.mockImplementationOnce(() => Promise.reject(new ApiError("No price data found for 'ZZZ'.", { status: 404, code: "not_found" })));
    at("/stock/ZZZ", <Dashboard onPick={() => {}} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No price data found for 'ZZZ'.");
    api.dashboard.mockReturnValue(ok(dashboard({ symbol: "ZZZ" })));
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByRole("heading", { name: "Apple Inc." })).toBeInTheDocument();
  });

  it("explains a network failure", async () => {
    api.dashboard.mockImplementation(() => Promise.reject(new ApiError("Cannot reach the FinSight server.", { code: "network" })));
    at("/stock/AAPL", <Dashboard onPick={() => {}} />);
    expect(await screen.findByText(/can't reach the server/i)).toBeInTheDocument();
  });

  it("keeps prices visible but marks news unavailable instead of inventing data", async () => {
    api.dashboard.mockReturnValue(ok(dashboard({ news: { unavailable: true, reason: "No news provider is currently available." }, sentiment_daily: [] })));
    at("/stock/AAPL", <Dashboard onPick={() => {}} />);
    expect(await screen.findByText(/news and sentiment unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/no news provider is currently available/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Latest price")).toBeInTheDocument();
  });

  it("shows an empty state when there are no articles", async () => {
    const d = dashboard();
    d.news = { ...d.news, articles: [], aggregate: { ...d.news.aggregate, n_articles: 0 } };
    api.dashboard.mockReturnValue(ok(d));
    at("/stock/AAPL", <Dashboard onPick={() => {}} />);
    expect(await screen.findByText(/no relevant news found/i)).toBeInTheDocument();
  });

  it("reports a throttled refresh without losing the page", async () => {
    api.dashboard.mockReturnValueOnce(ok(dashboard()));
    at("/stock/AAPL", <Dashboard onPick={() => {}} />);
    await screen.findByRole("heading", { name: "Apple Inc." });
    api.dashboard.mockImplementationOnce(() => Promise.reject(new ApiError("Refreshed moments ago. Try again in 40 seconds.", { status: 429, code: "rate_limited" })));
    await userEvent.click(screen.getByRole("button", { name: /refresh data/i }));
    expect(await screen.findByText(/try again in 40 seconds/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Apple Inc." })).toBeInTheDocument();
  });

  it("toggles the watchlist", async () => {
    api.dashboard.mockReturnValue(ok(dashboard()));
    api.addWatch.mockReturnValue(ok({ added: true }));
    at("/stock/AAPL", <Dashboard onPick={() => {}} />);
    await userEvent.click(await screen.findByRole("button", { name: /add to watchlist/i }));
    await waitFor(() => expect(api.addWatch).toHaveBeenCalledWith("AAPL", "Apple Inc."));
    expect(await screen.findByRole("button", { name: /on watchlist/i })).toBeInTheDocument();
  });

  it("home screen offers example tickers", async () => {
    const pick = vi.fn();
    at("/", <Dashboard onPick={pick} />, "/");
    await userEvent.click(screen.getByRole("button", { name: "TCS.NS" }));
    expect(pick).toHaveBeenCalledWith("TCS.NS");
  });
});

describe("News page", () => {
  const payload = (articles, total = articles.length) => ({ symbol: "AAPL", profile: { name: "Apple Inc." }, articles, total_before_filters: total, sources: ["Reuters"], providers_used: ["googlenews"],
    aggregate: dashboard().news.aggregate, topics: {} });

  it("lists articles and passes filters to the API", async () => {
    api.news.mockImplementation(() => ok(payload([article()])));
    at("/news/AAPL", <News />, "/news/:symbol");
    expect(await screen.findByText("Apple beats earnings estimates")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Sentiment"), "negative");
    await waitFor(() => expect(api.news).toHaveBeenLastCalledWith("AAPL", expect.objectContaining({ sentiment: "negative" }), expect.anything()));
  });

  it("distinguishes 'filters too strict' from 'no coverage'", async () => {
    api.news.mockImplementation((sym, params) => ok(params.sentiment ? payload([], 12) : payload([], 0)));
    at("/news/AAPL", <News />, "/news/:symbol");
    expect(await screen.findByText(/no relevant articles found/i)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Sentiment"), "negative");
    expect(await screen.findByText(/no articles match these filters/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(await screen.findByText(/no relevant articles found/i)).toBeInTheDocument();
  });

  it("shows an error state", async () => {
    api.news.mockImplementation(() => Promise.reject(new ApiError("No news provider is currently available.", { status: 502, code: "upstream_unavailable" })));
    at("/news/AAPL", <News />, "/news/:symbol");
    expect(await screen.findByRole("alert")).toHaveTextContent("No news provider is currently available.");
  });

  it("asks for a company when none is chosen", () => {
    at("/news", <News />, "/news");
    expect(screen.getByText(/pick a company first/i)).toBeInTheDocument();
  });
});

describe("Components", () => {
  it("article card opens the original in a new tab and reveals the explanation", async () => {
    render(<ArticleCard article={article()} />);
    const link = screen.getByRole("link", { name: /apple beats earnings/i });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    await userEvent.click(screen.getByRole("button", { name: /why this label/i }));
    expect(screen.getByText("beats")).toBeInTheDocument();
    expect(screen.getByText(/associative, not causal/i)).toBeInTheDocument();
    expect(screen.getByText(/revenue/)).toBeInTheDocument();
  });

  it("flags headline-only summaries and demo articles", () => {
    render(<ArticleCard article={article({ is_demo: true, explanation: { signals: [], summary_basis: "headline_only" } })} />);
    expect(screen.getByText("Demo data")).toBeInTheDocument();
    expect(screen.getByText(/headline only/i)).toBeInTheDocument();
  });

  it("prediction card warns when the model is no better than baseline", () => {
    render(<MemoryRouter><PredictionCard prediction={dashboard().prediction} symbol="AAPL" /></MemoryRouter>);
    expect(screen.getByText(/no more accurate than always guessing/i)).toBeInTheDocument();
  });

  it("prediction card shows a reason when unavailable", () => {
    render(<MemoryRouter><PredictionCard prediction={{ unavailable: true, reason: "Only 80 trading days available." }} symbol="X" /></MemoryRouter>);
    expect(screen.getByText(/trend forecast unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/only 80 trading days/i)).toBeInTheDocument();
  });

  it("search bar suggests companies and selects one", async () => {
    api.search.mockReturnValue(ok([{ symbol: "TCS.NS", name: "Tata Consultancy Services Limited", exchange: "NSE" }]));
    const onSelect = vi.fn();
    render(<SearchBar onSelect={onSelect} />);
    await userEvent.type(screen.getByLabelText(/search for a company/i), "tata");
    await userEvent.click(await screen.findByRole("option", { name: /tata consultancy/i }));
    expect(onSelect).toHaveBeenCalledWith("TCS.NS");
  });

  it("search bar still accepts a typed ticker when search fails", async () => {
    api.search.mockImplementation(() => Promise.reject(new ApiError("down")));
    const onSelect = vi.fn();
    render(<SearchBar onSelect={onSelect} />);
    await userEvent.type(screen.getByLabelText(/search for a company/i), "tsla{Enter}");
    expect(onSelect).toHaveBeenCalledWith("TSLA");
  });
});

describe("Watchlist page", () => {
  it("shows an empty state, then items with remove", async () => {
    api.watchlist.mockReturnValueOnce(ok([]));
    const { unmount } = render(<MemoryRouter><Watchlist /></MemoryRouter>);
    expect(await screen.findByText(/your watchlist is empty/i)).toBeInTheDocument();
    unmount();
    api.watchlist.mockReturnValue(ok([{ symbol: "TSLA", name: "Tesla, Inc.", exchange: "NASDAQ", quote: { price: 250, change: -2, change_pct: -0.8 } }, { symbol: "BAD", name: "Bad", quote: null }]));
    api.removeWatch.mockReturnValue(ok({}));
    render(<MemoryRouter><Watchlist /></MemoryRouter>);
    expect(await screen.findByText("Tesla, Inc.")).toBeInTheDocument();
    expect(screen.getByText(/price unavailable/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /remove tsla/i }));
    expect(api.removeWatch).toHaveBeenCalledWith("TSLA");
  });

  it("allows adding a ticker directly to watchlist", async () => {
    api.watchlist.mockReturnValue(ok([]));
    api.addWatch.mockReturnValue(ok({ symbol: "NVDA", added: true }));
    render(<MemoryRouter><Watchlist /></MemoryRouter>);
    const input = screen.getByPlaceholderText(/add ticker/i);
    await userEvent.type(input, "NVDA{Enter}");
    await waitFor(() => expect(api.addWatch).toHaveBeenCalledWith("NVDA"));
  });
});
