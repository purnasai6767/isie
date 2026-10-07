import { NextResponse } from "next/server";
import type { UsgsEarthquake, UsgsEarthquakeFeed } from "@/lib/types/usgs";

const USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

export const revalidate = 300;
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseEvent(value: unknown): UsgsEarthquake | null {
  if (!isRecord(value) || value.type !== "Feature" || typeof value.id !== "string") return null;
  if (!isRecord(value.properties) || !isRecord(value.geometry)) return null;

  const properties = value.properties;
  const coordinates = value.geometry.coordinates;
  if (
    value.geometry.type !== "Point" ||
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    typeof properties.title !== "string" ||
    typeof properties.place !== "string"
  ) {
    return null;
  }

  const [longitudeValue, latitudeValue, depthValue] = coordinates;
  const longitude = finiteNumber(longitudeValue);
  const latitude = finiteNumber(latitudeValue);
  if (
    longitude === null ||
    latitude === null ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }

  const time = finiteNumber(properties.time);
  const rawUrl = properties.url;
  let sourceUrl: string | null = null;
  if (typeof rawUrl === "string") {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol === "https:" && parsed.hostname === "earthquake.usgs.gov") {
        sourceUrl = parsed.toString();
      }
    } catch {
      sourceUrl = null;
    }
  }

  return {
    id: value.id,
    title: properties.title,
    place: properties.place,
    magnitude: finiteNumber(properties.mag),
    observedAt: time === null ? null : new Date(time).toISOString(),
    coordinates: {
      longitude,
      latitude,
      depthKm: finiteNumber(depthValue),
    },
    tsunamiFlag: properties.tsunami === 1,
    sourceUrl,
  };
}

export async function GET() {
  try {
    const response = await fetch(USGS_URL, {
      headers: { Accept: "application/geo+json, application/json" },
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      console.error(`USGS earthquake feed returned HTTP ${response.status}.`);
      return NextResponse.json(
        { error: "USGS earthquake feed is temporarily unavailable. Try again later." },
        { status: 502 }
      );
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload) || payload.type !== "FeatureCollection" || !Array.isArray(payload.features)) {
      console.error("USGS returned an unexpected earthquake feed format.");
      return NextResponse.json(
        { error: "USGS returned data in an unexpected format." },
        { status: 502 }
      );
    }

    const events = payload.features
      .map(parseEvent)
      .filter((event): event is UsgsEarthquake => event !== null);
    const generated = isRecord(payload.metadata) ? finiteNumber(payload.metadata.generated) : null;
    const result: UsgsEarthquakeFeed = {
      sourceUrl: USGS_URL,
      generatedAt: generated === null ? null : new Date(generated).toISOString(),
      fetchedAt: new Date().toISOString(),
      events,
    };
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("USGS earthquake feed request failed.", error);
    return NextResponse.json(
      { error: "Could not retrieve the USGS earthquake feed. Check the connection and try again." },
      { status: 502 }
    );
  }
}
