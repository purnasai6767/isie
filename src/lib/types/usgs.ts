export interface UsgsEarthquake {
  id: string;
  title: string;
  place: string;
  magnitude: number | null;
  observedAt: string | null;
  coordinates: {
    longitude: number;
    latitude: number;
    depthKm: number | null;
  };
  tsunamiFlag: boolean;
  sourceUrl: string | null;
}

export interface UsgsEarthquakeFeed {
  sourceUrl: string;
  generatedAt: string | null;
  fetchedAt: string;
  events: UsgsEarthquake[];
}
