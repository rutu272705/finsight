"""A small built-in directory of well-known tickers. Used only for name lookup / search fallback;
it contains no prices or other market data."""

DIRECTORY: list[tuple[str, str, str]] = [
    # (symbol, name, exchange)
    ("RELIANCE.NS", "Reliance Industries Limited", "NSE"),
    ("TCS.NS", "Tata Consultancy Services Limited", "NSE"),
    ("INFY.NS", "Infosys Limited", "NSE"),
    ("HDFCBANK.NS", "HDFC Bank Limited", "NSE"),
    ("ICICIBANK.NS", "ICICI Bank Limited", "NSE"),
    ("SBIN.NS", "State Bank of India", "NSE"),
    ("WIPRO.NS", "Wipro Limited", "NSE"),
    ("HCLTECH.NS", "HCL Technologies Limited", "NSE"),
    ("ITC.NS", "ITC Limited", "NSE"),
    ("LT.NS", "Larsen & Toubro Limited", "NSE"),
    ("BHARTIARTL.NS", "Bharti Airtel Limited", "NSE"),
    ("HINDUNILVR.NS", "Hindustan Unilever Limited", "NSE"),
    ("KOTAKBANK.NS", "Kotak Mahindra Bank Limited", "NSE"),
    ("AXISBANK.NS", "Axis Bank Limited", "NSE"),
    ("MARUTI.NS", "Maruti Suzuki India Limited", "NSE"),
    ("TATAMOTORS.NS", "Tata Motors Limited", "NSE"),
    ("TATASTEEL.NS", "Tata Steel Limited", "NSE"),
    ("SUNPHARMA.NS", "Sun Pharmaceutical Industries Limited", "NSE"),
    ("ADANIENT.NS", "Adani Enterprises Limited", "NSE"),
    ("BAJFINANCE.NS", "Bajaj Finance Limited", "NSE"),
    ("ASIANPAINT.NS", "Asian Paints Limited", "NSE"),
    ("TITAN.NS", "Titan Company Limited", "NSE"),
    ("ZOMATO.NS", "Zomato Limited", "NSE"),
    ("AAPL", "Apple Inc.", "NASDAQ"),
    ("MSFT", "Microsoft Corporation", "NASDAQ"),
    ("GOOGL", "Alphabet Inc.", "NASDAQ"),
    ("AMZN", "Amazon.com, Inc.", "NASDAQ"),
    ("TSLA", "Tesla, Inc.", "NASDAQ"),
    ("NVDA", "NVIDIA Corporation", "NASDAQ"),
    ("META", "Meta Platforms, Inc.", "NASDAQ"),
    ("NFLX", "Netflix, Inc.", "NASDAQ"),
    ("AMD", "Advanced Micro Devices, Inc.", "NASDAQ"),
    ("INTC", "Intel Corporation", "NASDAQ"),
    ("ADBE", "Adobe Inc.", "NASDAQ"),
    ("JPM", "JPMorgan Chase & Co.", "NYSE"),
    ("BAC", "Bank of America Corporation", "NYSE"),
    ("GS", "The Goldman Sachs Group, Inc.", "NYSE"),
    ("V", "Visa Inc.", "NYSE"),
    ("WMT", "Walmart Inc.", "NYSE"),
    ("DIS", "The Walt Disney Company", "NYSE"),
    ("KO", "The Coca-Cola Company", "NYSE"),
    ("PFE", "Pfizer Inc.", "NYSE"),
    ("XOM", "Exxon Mobil Corporation", "NYSE"),
    ("BA", "The Boeing Company", "NYSE"),
    ("NKE", "NIKE, Inc.", "NYSE"),
    ("UBER", "Uber Technologies, Inc.", "NYSE"),
    ("SHEL", "Shell plc", "NYSE"),
    ("BP.L", "BP p.l.c.", "LSE"),
    ("HSBA.L", "HSBC Holdings plc", "LSE"),
]

_BY_SYMBOL = {s: (n, e) for s, n, e in DIRECTORY}


def lookup(symbol: str) -> tuple[str, str] | None:
    return _BY_SYMBOL.get(symbol.upper())


def search_local(q: str, limit: int = 8) -> list[dict]:
    q = q.strip().lower()
    if not q:
        return []
    scored = []
    for sym, name, exch in DIRECTORY:
        s, n = sym.lower(), name.lower()
        if s == q:
            score = 0
        elif s.startswith(q):
            score = 1
        elif n.startswith(q):
            score = 2
        elif q in n or q in s:
            score = 3
        else:
            continue
        scored.append((score, sym, name, exch))
    scored.sort()
    return [{"symbol": s, "name": n, "exchange": e, "type": "EQUITY", "source": "directory"} for _, s, n, e in scored[:limit]]
