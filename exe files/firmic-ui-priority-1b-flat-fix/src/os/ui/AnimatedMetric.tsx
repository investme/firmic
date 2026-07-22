import { useEffect, useMemo, useState } from "react";

export function useAnimatedNumber(target: number, durationMs = 650): number {
  const safeTarget = Number.isFinite(target) ? target : 0;
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();
    const from = value;
    const distance = safeTarget - from;

    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + distance * eased);
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [safeTarget, durationMs]);

  return value;
}

export function AnimatedMetric({ value }: { value: string }) {
  const parsed = useMemo(() => {
    const match = value.match(/^([^0-9-]*)(-?[0-9][0-9,]*(?:\.[0-9]+)?)(.*)$/);
    if (!match) return null;
    const raw = match[2].replace(/,/g, "");
    const number = Number(raw);
    return Number.isFinite(number)
      ? { prefix: match[1], number, raw, suffix: match[3] }
      : null;
  }, [value]);

  const animated = useAnimatedNumber(parsed?.number ?? 0);

  if (!parsed) return <>{value}</>;

  const decimals = parsed.raw.includes(".") ? 2 : 0;

  return (
    <>
      {parsed.prefix}
      {animated.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {parsed.suffix}
    </>
  );
}
