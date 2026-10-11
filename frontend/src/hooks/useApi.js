import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Runs `makeRequest(signal)` whenever `deps` change. Return null from makeRequest to stay idle.
 * Exposes { data, meta, error, loading, reload } where `meta` is the response envelope without `data`.
 */
export function useApi(makeRequest, deps = []) {
  const [state, setState] = useState({ data: null, meta: null, error: null, loading: false });
  const [nonce, setNonce] = useState(0);
  const reqRef = useRef(makeRequest);
  reqRef.current = makeRequest;

  useEffect(() => {
    const ctrl = new AbortController();
    const promise = reqRef.current(ctrl.signal);
    if (!promise) {
      setState({ data: null, meta: null, error: null, loading: false });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    promise
      .then((json) => {
        const { data, ...meta } = json;
        setState({ data, meta, error: null, loading: false });
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setState({ data: null, meta: null, error, loading: false });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
