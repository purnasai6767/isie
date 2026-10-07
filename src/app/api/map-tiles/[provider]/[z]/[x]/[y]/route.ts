import { NextRequest, NextResponse } from "next/server";

const TILE_PROVIDERS = {
  "esri-imagery": {
    url: (z: number, x: number, y: number) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    attribution: "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
  },
  "esri-labels": {
    url: (z: number, x: number, y: number) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${z}/${y}/${x}`,
    attribution: "Boundaries and place names © Esri",
  },
  "esri-streets": {
    url: (z: number, x: number, y: number) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`,
    attribution: "Map data and tiles © Esri",
  },
  carto: {
    url: (z: number, x: number, y: number) =>
      `https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`,
    attribution: "© CARTO © OpenStreetMap contributors",
  },
  openstreetmap: {
    url: (z: number, x: number, y: number) =>
      `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    attribution: "© OpenStreetMap contributors",
  },
} as const;

type TileProvider = keyof typeof TILE_PROVIDERS;

function isTileProvider(value: string): value is TileProvider {
  return Object.hasOwn(TILE_PROVIDERS, value);
}

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string; z: string; x: string; y: string }> }
) {
  const { provider, z: rawZoom, x: rawX, y: rawY } = await params;
  const z = Number(rawZoom);
  const x = Number(rawX);
  const y = Number(rawY);

  if (
    !isTileProvider(provider) ||
    !Number.isInteger(z) ||
    z < 0 ||
    z > 19 ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x >= 2 ** z ||
    y >= 2 ** z
  ) {
    return NextResponse.json({ error: "Invalid map tile request." }, { status: 400 });
  }

  try {
    const response = await fetch(TILE_PROVIDERS[provider].url(z, x, y), {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,*/*",
        ...(provider === "openstreetmap" ? { "User-Agent": "ISIE spatial dashboard map tiles" } : {}),
      },
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 86_400 },
    });
    const contentType = response.headers.get("content-type")?.split(";")[0].trim() ?? "";

    if (!response.ok || !contentType.startsWith("image/")) {
      console.error(`Map tile provider ${provider} returned HTTP ${response.status} with ${contentType || "no content type"}.`);
      return NextResponse.json({ error: "Map tile provider is temporarily unavailable." }, { status: 502 });
    }

    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        "Content-Type": contentType,
        "X-Map-Tile-Attribution": TILE_PROVIDERS[provider].attribution,
      },
    });
  } catch (error) {
    console.error(`Map tile request failed for provider ${provider}.`, error);
    return NextResponse.json({ error: "Map tiles could not be retrieved." }, { status: 502 });
  }
}
