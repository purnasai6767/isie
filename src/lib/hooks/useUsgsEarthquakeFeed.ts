"use client";

import { useCallback, useEffect, useState } from "react";
import type { UsgsEarthquakeFeed } from "@/lib/types/usgs";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isUsgsEarthquakeFeed(value: unknown): value is UsgsEarthquakeFeed {
  if (!isRecord(value)) return false;
  return (
    typeof value.fetchedAt === "string" &&
    typeof value.sourceUrl === "string" &&
    Array.isArray(value.events) &&
    (typeof value.generatedAt === "string" || value.generatedAt === null) &&
    value.events.every((event) => {
      if (!isRecord(event) || !isRecord(event.coordinates)) return false;
      return (
      typeof event.id === "string" &&
      typeof event.title === "string" &&
      typeof event.place === "string" &&
      isNullableFiniteNumber(event.magnitude) &&
      (typeof event.observedAt === "string" || event.observedAt === null) &&
      typeof event.coordinates.longitude === "number" &&
      Number.isFinite(event.coordinates.longitude) &&
      event.coordinates.longitude >= -180 &&
      event.coordinates.longitude <= 180 &&
      typeof event.coordinates.latitude === "number" &&
      Number.isFinite(event.coordinates.latitude) &&
      event.coordinates.latitude >= -90 &&
      event.coordinates.latitude <= 90 &&
      isNullableFiniteNumber(event.coordinates.depthKm) &&
      typeof event.tsunamiFlag === "boolean" &&
      (typeof event.sourceUrl === "string" || event.sourceUrl === null)
      );
    })
  );
}

export function useUsgsEarthquakeFeed() {
  const [feed, setFeed] = useState<UsgsEarthquakeFeed | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/usgs-earthquakes", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result: unknown = await response.json();
        if (!response.ok) {
          const message =
            typeof result === "object" &&
            result !== null &&
            "error" in result &&
            typeof result.error === "string"
              ? result.error
              : `USGS request failed (HTTP ${response.status}).`;
          throw new Error(message);
        }
        if (!isUsgsEarthquakeFeed(result)) {
          throw new Error("USGS returned an unexpected earthquake feed format.");
        }
        if (active) setFeed(result);
      } catch (loadError) {
        if (active && !(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setError(loadError instanceof Error ? loadError.message : "Could not load USGS earthquakes.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [refreshKey]);

  const refresh = useCallback(() => setRefreshKey((current) => current + 1), []);
  return { feed, error, loading, refresh };
}
