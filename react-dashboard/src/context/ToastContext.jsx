import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Toaster } from '../components/ui/Toaster.jsx';

const ToastContext = createContext(null);

let nextId = 0;

/**
 * Transient confirmation for things that worked.
 *
 * Successful actions get a toast, never a blocking dialog — an alert() that
 * has to be dismissed after every saved status change turns a two-second job
 * into a four-second one. Failures that a person must act on stay inline, next
 * to whatever they were doing.
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message, tone = 'success') => {
      const id = ++nextId;
      setToasts((current) => [...current, { id, message, tone }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider');
  return context;
};
