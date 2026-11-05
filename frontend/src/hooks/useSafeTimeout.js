import { useCallback, useEffect, useRef } from "react";

/**
 * useSafeTimeout — drop-in replacement for window.setTimeout that can never
 * fire after unmount (no yanked navigation, no setState-on-unmounted).
 *
 * Usage: const safeTimeout = useSafeTimeout();
 *        safeTimeout(() => navigate("/login"), 1200);
 */
export const useSafeTimeout = () => {
  const timers = useRef(new Set());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((id) => window.clearTimeout(id));
      pending.clear();
    };
  }, []);

  return useCallback((fn, ms) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
    return id;
  }, []);
};

export default useSafeTimeout;
