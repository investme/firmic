import { useEffect, useRef, useState } from "react";

import type { OSSearchItem } from "./types";
import { useOS } from "./useOS";

export function useFirmicSearch(query: string, delay = 120) {
  const { searchFirmic } = useOS();
  const requestIdRef = useRef(0);
  const [results, setResults] = useState<OSSearchItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const timeout = window.setTimeout(async () => {
      setLoading(true);

      try {
        const nextResults = await searchFirmic(query);

        if (requestId === requestIdRef.current) {
          setResults(nextResults);
        }
      } catch (error) {
        console.error("Firmic global search failed.", error);

        if (requestId === requestIdRef.current) {
          setResults([]);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [delay, query, searchFirmic]);

  return { results, loading };
}
