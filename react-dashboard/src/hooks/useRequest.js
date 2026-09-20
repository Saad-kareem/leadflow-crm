import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs a request and exposes the four states every screen has to handle:
 * loading, error, empty and loaded.
 *
 * Having this in one hook is what makes those states consistent across the
 * app. It also means "and a retry button" is free everywhere, rather than
 * being something each page remembers to add.
 *
 * `refreshing` is separate from `loading` on purpose: the first load shows
 * skeletons, but a filter change should leave the existing rows on screen and
 * dim them, because replacing a table with skeletons on every keystroke is
 * both slower to read and visually noisy.
 *
 * @param {(options: {signal: AbortSignal}) => Promise<any>} run
 * @param {Array} deps  re-runs when these change
 */
export const useRequest = (run, deps = []) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const hasLoaded = useRef(false);
  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    if (hasLoaded.current) setRefreshing(true);
    else setLoading(true);

    run({ signal: controller.signal })
      .then((result) => {
        setData(result);
        setError(null);
        hasLoaded.current = true;
      })
      .catch((requestError) => {
        // The component moved on — a superseded request must not overwrite
        // the state of the one that replaced it.
        if (requestError.name === 'AbortError') return;
        setError(requestError);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken]);

  /** Applies a local change without a round trip, e.g. after a PATCH. */
  const mutate = useCallback((updater) => {
    setData((current) => (typeof updater === 'function' ? updater(current) : updater));
  }, []);

  return { data, error, loading, refreshing, reload, mutate };
};
