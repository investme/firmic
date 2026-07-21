import { useEffect, useMemo, useState } from "react";

export function useLiveRelativeTime(
  value: Date | string | number | null,
  intervalMs = 1000
): string {
  const timestamp = useMemo(() => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }, [value]);

  const [, setTick] = useState(0);

  useEffect(() => {
    if (timestamp === null) return;

    const timer = window.setInterval(
      () => setTick((current) => current + 1),
      intervalMs
    );

    return () => window.clearInterval(timer);
  }, [timestamp, intervalMs]);

  if (timestamp === null) return "Not reviewed yet";

  const difference = Math.max(0, Date.now() - timestamp);
  const seconds = Math.floor(difference / 1000);

  if (seconds < 5) return "Reviewed just now";
  if (seconds < 60) return `Reviewed ${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `Reviewed ${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Reviewed ${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `Reviewed ${days}d ago`;
}
