import { useEffect, useRef, useState } from 'react';

import { motion } from '@/constants/theme';

/**
 * Animates a numeric value towards `target`.
 *
 * Balances are counted rather than snapped so a credit award reads as an event. The
 * first value shown is never animated — landing on a screen should not look like the
 * balance just changed.
 */
export function useCountUp(target: number, durationMs: number = motion.deliberate): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const frameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const initialisedRef = useRef(false);

  useEffect(() => {
    if (!initialisedRef.current) {
      initialisedRef.current = true;
      fromRef.current = target;
      setValue(target);
      return;
    }

    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) return;

    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / durationMs);
      // Ease-out cubic: fast at first, settling gently on the final figure.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + delta * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      fromRef.current = target;
    };
  }, [target, durationMs]);

  return value;
}
