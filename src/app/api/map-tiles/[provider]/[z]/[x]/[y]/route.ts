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
  "nasa-sar": {
    url: (z: number, x: number, y: number, date?: string) =>
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/OPERA_L2_Radiometric_Terrain_Corrected_SAR_Sentinel-1/default/${date ? `${date}/` : ""}GoogleMapsCompatible_Level12/${z}/${y}/${x}.png`,
    attribution: "NASA GIBS · OPERA Sentinel-1 RTC SAR",
  },
  "nasa-water": {
    url: (z: number, x: number, y: number, date?: string) =>
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/OPERA_L3_Dynamic_Surface_Water_Extent-Sentinel-1/default/${date ? `${date}/` : ""}GoogleMapsCompatible_Level12/${z}/${y}/${x}.png`,
    attribution: "NASA GIBS · OPERA Sentinel-1 Dynamic Surface Water Extent",
  },
  "terrain-dem": {
    url: (z: number, x: number, y: number) =>
      `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
    attribution: "AWS Terrain Tiles · Mapzen · CC BY 4.0",
  },
} as const;

type TileProvider = keyof typeof TILE_PROVIDERS;

function isTileProvider(value: string): value is TileProvider {
  return Object.hasOwn(TILE_PROVIDERS, value);
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string; z: string; x: string; y: string }> }
) {
  const { provider, z: rawZoom, x: rawX, y: rawY } = await params;
  const z = Number(rawZoom);
  const x = Number(rawX);
  const y = Number(rawY);
  const date = request.nextUrl.searchParams.get("date") ?? undefined;
  const nasaLayer = provider === "nasa-sar" || provider === "nasa-water";
  const maxZoom = nasaLayer ? 12 : provider === "terrain-dem" ? 15 : 19;

  if (
    !isTileProvider(provider) ||
    !Number.isInteger(z) ||
    z < 0 ||
    z > maxZoom ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x >= 2 ** z ||
    y >= 2 ** z ||
    (date !== undefined && (!nasaLayer || !isIsoDate(date)))
  ) {
    return NextResponse.json({ error: "Invalid map tile request." }, { status: 400 });
  }

  try {
    const providerConfig = TILE_PROVIDERS[provider];
    const tileUrl = nasaLayer
      ? providerConfig.url(z, x, y, date)
      : providerConfig.url(z, x, y);
    const fetchTile = () =>
      fetch(tileUrl, {
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,*/*",
          ...(provider === "openstreetmap" ? { "User-Agent": "ISIE spatial dashboard map tiles" } : {}),
        },
        signal: AbortSignal.timeout(10_000),
        next: { revalidate: 86_400 },
      });
    let response = await fetchTile();
    if (response.status >= 500) {
      await response.body?.cancel();
      await new Promise((resolve) => setTimeout(resolve, 250));
      response = await fetchTile();
    }
    const contentType = response.headers.get("content-type")?.split(";")[0].trim() ?? "";

    if (!response.ok || !contentType.startsWith("image/")) {
      console.error(`Map tile provider ${provider} returned HTTP ${response.status} with ${contentType || "no content type"}.`);
      return NextResponse.json({ error: "Map tile provider is temporarily unavailable." }, { status: 502 });
    }

    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        "Content-Type": contentType,
        "X-Map-Tile-Attribution": providerConfig.attribution,
      },
    });
  } catch (error) {
    console.error(`Map tile request failed for provider ${provider}.`, error);
    return NextResponse.json({ error: "Map tiles could not be retrieved." }, { status: 502 });
  }
}
