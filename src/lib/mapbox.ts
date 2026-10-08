const configuredMapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();

export const MAPBOX_ACCESS_TOKEN = configuredMapboxToken?.startsWith("pk.")
  ? configuredMapboxToken
  : undefined;
