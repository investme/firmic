import { useEffect, useMemo, useState } from "react";

export function useAnimatedNumber(
  target: number,
  durationMs = 650
): number {
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

      if (progress < 1) {
        frame = window.requestAnimationFrame(animate);
      }
    };

    frame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frame);
  }, [safeTarget, durationMs]);

  return value;
}

export function AnimatedMetric({
  value,
  decimals,
}: {
  value: string;
  decimals?: number;
}) {
  const parsed = useMemo(() => parseMetric(value), [value]);
  const animated = useAnimatedNumber(parsed.number);

  if (!parsed.valid) {
    return <>{value}</>;
  }

  const precision =
    decimals ??
    (String(parsed.rawNumber).includes(".") ? 2 : 0);

  return (
    <>
      {parsed.prefix}
      {animated.toLocaleString(undefined, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      })}
      {parsed.suffix}
    </>
  );
}

function parseMetric(value: string) {
  const match = value.match(/^([^0-9-]*)(-?[0-9][0-9,]*(?:\.[0-9]+)?)(.*)$/);

  if (!match) {
    return {
      valid: false,
      number: 0,
      rawNumber: "0",
      prefix: "",
      suffix: "",
    };
  }

  const rawNumber = match[2].replace(/,/g, "");
  const number = Number(rawNumber);

  return {
    valid: Number.isFinite(number),
    number: Number.isFinite(number) ? number : 0,
    rawNumber,
    prefix: match[1],
    suffix: match[3],
  };
}
