export interface PublicWeatherForecast {
  sourceUrl: string;
  attributionUrl: string;
  fetchedAt: string;
  location: {
    name: string;
    admin1: string | null;
    country: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  current: {
    time: string;
    temperatureC: number | null;
    relativeHumidityPercent: number | null;
    precipitationMm: number | null;
    weatherCode: number | null;
    windSpeedKmh: number | null;
    windDirectionDegrees: number | null;
  };
  daily: Array<{
    date: string;
    weatherCode: number | null;
    temperatureMaxC: number | null;
    temperatureMinC: number | null;
    precipitationMm: number | null;
    precipitationProbabilityMaxPercent: number | null;
  }>;
}
