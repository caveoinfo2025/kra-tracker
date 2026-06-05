"use client";
import { useState, useEffect } from "react";

/**
 * Fetches master values for a given masterCode from the DB via /api/master-values.
 * Falls back to the provided hardcoded array if the master definition doesn't exist
 * or the fetch fails — so dropdowns always work even before the master data migration
 * is applied to a given environment.
 */
export function useMasterValues(
  masterCode: string,
  fallback: readonly string[],
): string[] {
  const [values, setValues] = useState<string[]>([...fallback]);

  useEffect(() => {
    fetch(`/api/master-values?code=${encodeURIComponent(masterCode)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: string[] | null) => {
        if (data && data.length > 0) setValues(data);
      })
      .catch(() => {});
  }, [masterCode]);

  return values;
}
