"use client";

import { useCallback, useEffect, useState } from "react";
import type { EonetFeed } from "@/lib/types/eonet";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

function isEonetFeed(value: unknown): value is EonetFeed {
  if (typeof value !== "object" || value === null) return false;
  if (!("fetchedAt" in value) || typeof value.fetchedAt !== "string") return false;
  if (!("sourceUrl" in value) || typeof value.sourceUrl !== "string") return false;
  if (!("events" in value) || !Array.isArray(value.events)) return false;
  return value.events.every((event) => {
    if (typeof event !== "object" || event === null) return false;
    return (
      "id" in event &&
      typeof event.id === "string" &&
      "title" in event &&
      typeof event.title === "string" &&
      "categories" in event &&
      Array.isArray(event.categories) &&
      "observedAt" in event &&
      (typeof event.observedAt === "string" || event.observedAt === null) &&
      "sourceUrl" in event &&
      (typeof event.sourceUrl === "string" || event.sourceUrl === null) &&
      "location" in event &&
      (event.location === null ||
        (typeof event.location === "object" &&
          event.location !== null &&
          "longitude" in event.location &&
          typeof event.location.longitude === "number" &&
          "latitude" in event.location &&
          typeof event.location.latitude === "number"))
    );
  });
}

export function useEonetFeed() {
  const [feed, setFeed] = useState<EonetFeed | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let requestActive = false;
    let forceRefresh = refreshKey > 0;

    const load = async () => {
      if (requestActive) return;
      requestActive = true;
      setLoading(true);
      setError("");
      try {
        const response = await fetch(forceRefresh ? "/api/nasa-eonet?refresh=1" : "/api/nasa-eonet", {
          signal: controller.signal,
          cache: "no-store",
        });
        forceRefresh = false;
        const result: unknown = await response.json();
        if (!response.ok) {
          const message =
            typeof result === "object" &&
            result !== null &&
            "error" in result &&
            typeof result.error === "string"
              ? result.error
              : `NASA EONET request failed (HTTP ${response.status}).`;
          throw new Error(message);
        }
        if (!isEonetFeed(result)) {
          throw new Error("NASA EONET returned an unexpected response format.");
        }
        if (active) setFeed(result);
      } catch (loadError) {
        if (active && !(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setError(loadError instanceof Error ? loadError.message : "Could not load NASA EONET events.");
        }
      } finally {
        requestActive = false;
        if (active) setLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [refreshKey]);

  const refresh = useCallback(() => setRefreshKey((current) => current + 1), []);

  return { feed, error, loading, refresh };
}
