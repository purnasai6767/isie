import { NextRequest, NextResponse } from "next/server";
import type { EonetEvent, EonetFeed } from "@/lib/types/eonet";

const EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=200";

export const revalidate = 600;
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseEvent(value: unknown): EonetEvent | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string") {
    return null;
  }

  const categories = Array.isArray(value.categories)
    ? value.categories
        .filter(isRecord)
        .map((category) => category.title)
        .filter((title): title is string => typeof title === "string" && title.length > 0)
    : [];

  const geometry = Array.isArray(value.geometry)
    ? value.geometry.filter(isRecord).sort((a, b) => {
        const firstDate = typeof a.date === "string" ? Date.parse(a.date) : 0;
        const secondDate = typeof b.date === "string" ? Date.parse(b.date) : 0;
        return secondDate - firstDate;
      })
    : [];
  const point = geometry.find((item) => {
    if (item.type !== "Point" || !Array.isArray(item.coordinates)) return false;
    const [longitude, latitude] = item.coordinates;
    return (
      typeof longitude === "number" &&
      Number.isFinite(longitude) &&
      longitude >= -180 &&
      longitude <= 180 &&
      typeof latitude === "number" &&
      Number.isFinite(latitude) &&
      latitude >= -90 &&
      latitude <= 90
    );
  });

  const [longitude, latitude] = point?.coordinates as number[] | undefined ?? [];
  const observedAt = geometry.find((item) => typeof item.date === "string" && !Number.isNaN(Date.parse(item.date)))?.date;
  const sources = Array.isArray(value.sources) ? value.sources.filter(isRecord) : [];
  const sourceUrl = sources.map((source) => safeHttpsUrl(source.url)).find(Boolean)
    ?? safeHttpsUrl(value.link);

  return {
    id: value.id,
    title: value.title,
    categories,
    observedAt: typeof observedAt === "string" ? new Date(observedAt).toISOString() : null,
    location: point ? { longitude, latitude } : null,
    sourceUrl,
  };
}

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  try {
    const response = await fetch(EONET_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
      ...(forceRefresh ? { cache: "no-store" as const } : { next: { revalidate: 600 } }),
    });

    if (!response.ok) {
      console.error(`NASA EONET returned HTTP ${response.status}.`);
      return NextResponse.json(
        { error: "NASA EONET is temporarily unavailable. Try again later." },
        { status: 502 }
      );
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload) || !Array.isArray(payload.events)) {
      console.error("NASA EONET returned an unexpected response format.");
      return NextResponse.json(
        { error: "NASA EONET returned data in an unexpected format." },
        { status: 502 }
      );
    }

    const events = payload.events
      .map(parseEvent)
      .filter((event): event is EonetEvent => event !== null);
    const result: EonetFeed = {
      sourceUrl: EONET_URL,
      fetchedAt: new Date().toISOString(),
      events,
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": forceRefresh ? "no-store" : "public, s-maxage=600, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("NASA EONET request failed.", error);
    return NextResponse.json(
      { error: "Could not retrieve NASA EONET events. Check the connection and try again." },
      { status: 502 }
    );
  }
}
