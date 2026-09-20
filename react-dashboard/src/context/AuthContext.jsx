import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../lib/api.js';

const AuthContext = createContext(null);

/**
 * Session state.
 *
 * The token lives in localStorage so a refresh does not sign the user out, and
 * it is verified against `/api/auth/me` on boot rather than being trusted — a
 * token that has expired since the last visit would otherwise let the app
 * render a dashboard that immediately fails to load anything.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(Boolean(tokenStore.get()));

  const signOut = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // Lets the API layer end the session from anywhere, including a background
  // request whose component has already unmounted.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) {
      setRestoring(false);
      return;
    }

    let active = true;

    api
      .me()
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        tokenStore.clear();
      })
      .finally(() => {
        if (active) setRestoring(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (credentials) => {
    const data = await api.login(credentials);
    tokenStore.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({ user, restoring, signIn, signOut, isAuthenticated: Boolean(user) }),
    [user, restoring, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
};
