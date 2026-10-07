import { NextRequest, NextResponse } from "next/server";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

export const dynamic = "force-dynamic";

interface PlaceResult {
  id: number;
  name: string;
  admin1: string | null;
  country: string;
  countryCode: string | null;
  latitude: number;
  longitude: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePlace(value: unknown): PlaceResult | null {
  if (!isRecord(value)) return null;
  const { id, name, country, latitude, longitude } = value;
  if (
    typeof id !== "number" ||
    !Number.isInteger(id) ||
    typeof name !== "string" ||
    typeof country !== "string" ||
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    id,
    name,
    admin1: typeof value.admin1 === "string" ? value.admin1 : null,
    country,
    countryCode: typeof value.country_code === "string" ? value.country_code : null,
    latitude,
    longitude,
  };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2 || query.length > 100) {
    return NextResponse.json(
      { error: "Enter a place name between 2 and 100 characters." },
      { status: 400 }
    );
  }

  try {
    const url = new URL(GEOCODING_URL);
    url.searchParams.set("name", query);
    url.searchParams.set("count", "10");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 86_400 },
    });
    if (!response.ok) {
      console.error(`Open-Meteo geocoding returned HTTP ${response.status}.`);
      return NextResponse.json(
        { error: "Public place search is temporarily unavailable. Try again later." },
        { status: 502 }
      );
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload) || !Array.isArray(payload.results)) {
      console.error("Open-Meteo geocoding returned an unexpected response format.");
      return NextResponse.json(
        { error: "Place search returned data in an unexpected format." },
        { status: 502 }
      );
    }

    const places = payload.results
      .map(parsePlace)
      .filter((place): place is PlaceResult => place !== null);
    return NextResponse.json(
      { provider: "Open-Meteo Geocoding API", fetchedAt: new Date().toISOString(), places },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } }
    );
  } catch (error) {
    console.error("Public place search failed.", error);
    return NextResponse.json(
      { error: "Could not retrieve public place search results. Check the connection and try again." },
      { status: 502 }
    );
  }
}
