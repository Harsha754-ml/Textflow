import { useEffect, useRef, useState } from 'react';

export function useAdaptivePolling(pollFn, options = {}) {
  const {
    enabled = true,
    baseDelayMs = 5000,
    backoffDelayMs = 30000,
    failureThreshold = 3,
    immediate = true,
    dependencies = [],
  } = options;
  const timerRef = useRef(null);
  const failureCountRef = useRef(0);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let cancelled = false;

    const clearTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const schedule = (delay) => {
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        void run();
      }, delay);
    };

    const run = async () => {
      if (cancelled) {
        return;
      }

      if (document.visibilityState === 'hidden') {
        schedule(backoffDelayMs);
        return;
      }

      setIsChecking(true);
      try {
        await pollFn();
        failureCountRef.current = 0;
        schedule(baseDelayMs);
      } catch (error) {
        failureCountRef.current += 1;
        schedule(failureCountRef.current >= failureThreshold ? backoffDelayMs : baseDelayMs);
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void run();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    if (immediate) {
      void run();
    } else {
      schedule(baseDelayMs);
    }

    return () => {
      cancelled = true;
      clearTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [pollFn, enabled, baseDelayMs, backoffDelayMs, failureThreshold, immediate, ...dependencies]);

  return {
    isChecking,
  };
}
