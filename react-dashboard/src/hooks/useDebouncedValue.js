import { useEffect, useState } from 'react';

/**
 * Delays a value until it stops changing.
 *
 * Used for the search box: firing a request per keystroke means five requests
 * to type "ayesha", and the answers can arrive out of order. Waiting a beat
 * costs nothing a person notices and sends one.
 */
export const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
