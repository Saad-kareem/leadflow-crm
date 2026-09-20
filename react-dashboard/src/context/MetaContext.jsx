import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

const MetaContext = createContext(null);

/**
 * The shared vocabulary, fetched once from `/api/meta`.
 *
 * Statuses, services, budgets and score bands are defined by the API and used
 * here to build every select and badge. Keeping a second copy in the front end
 * is how a dropdown ends up offering a value the server will reject.
 *
 * The fallback below is not a second copy of that list — it is only the shape
 * the app needs to render at all if the request fails, so a network blip shows
 * an error state instead of a blank page.
 */
const EMPTY_META = {
  statuses: [],
  sources: [],
  services: [],
  budgets: [],
  scoreBands: [],
  duplicateRule: '',
};

export const MetaProvider = ({ children }) => {
  const [meta, setMeta] = useState(EMPTY_META);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api
      .meta()
      .then((data) => {
        if (active) setMeta(data);
      })
      .catch(() => {
        // Non-fatal: pages that need a dropdown will show their own error.
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({ ...meta, loading }), [meta, loading]);

  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>;
};

export const useMeta = () => {
  const context = useContext(MetaContext);
  if (!context) throw new Error('useMeta must be used inside a MetaProvider');
  return context;
};
