export interface EonetEvent {
  id: string;
  title: string;
  categories: string[];
  observedAt: string | null;
  location: { longitude: number; latitude: number } | null;
  sourceUrl: string | null;
}

export interface EonetFeed {
  sourceUrl: string;
  fetchedAt: string;
  events: EonetEvent[];
}
