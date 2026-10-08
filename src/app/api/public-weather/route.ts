import { NextRequest, NextResponse } from "next/server";
import type { PublicWeatherForecast } from "@/lib/types/publicWeather";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 10_000;

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function validCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isNullableNumberArray(value: unknown): value is Array<number | null> {
  return Array.isArray(value) && value.every((item) => item === null || finiteNumber(item) !== null);
}

function providerUnavailable() {
  return NextResponse.json(
    { error: "Open-Meteo is temporarily unavailable. Try again later." },
    { status: 502 }
  );
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const place = params.get("place")?.trim();
  const rawLatitude = params.get("latitude");
  const rawLongitude = params.get("longitude");
  const hasCoordinates = rawLatitude !== null || rawLongitude !== null;
  let latitude: number;
  let longitude: number;
  let locationName: string;
  let admin1: string | null = null;
  let country = "";

  try {
    if (hasCoordinates) {
      const parsedLatitude = rawLatitude === null ? Number.NaN : Number(rawLatitude);
      const parsedLongitude = rawLongitude === null ? Number.NaN : Number(rawLongitude);
      if (
        rawLatitude?.trim() === "" ||
        rawLongitude?.trim() === "" ||
        !validCoordinate(parsedLatitude, -90, 90) ||
        !validCoordinate(parsedLongitude, -180, 180)
      ) {
        return NextResponse.json(
          { error: "Provide valid latitude and longitude coordinates." },
          { status: 400 }
        );
      }
      latitude = parsedLatitude;
      longitude = parsedLongitude;
      locationName = params.get("label")?.trim().slice(0, 100) || "Selected region";
      country = "Regional forecast";
    } else {
      if (!place || place.length < 2 || place.length > 100) {
        return NextResponse.json(
          { error: "Enter a place name between 2 and 100 characters." },
          { status: 400 }
        );
      }

      const geocodingUrl = new URL(GEOCODING_URL);
      geocodingUrl.searchParams.set("name", place);
      geocodingUrl.searchParams.set("count", "1");
      geocodingUrl.searchParams.set("language", "en");
      geocodingUrl.searchParams.set("format", "json");

      const geocodingResponse = await fetch(geocodingUrl, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        next: { revalidate: 86_400 },
      });
      if (!geocodingResponse.ok) {
        console.error(`Open-Meteo geocoding returned HTTP ${geocodingResponse.status}.`);
        return providerUnavailable();
      }

      const geocodingPayload: unknown = await geocodingResponse.json();
      if (!isRecord(geocodingPayload) || !Array.isArray(geocodingPayload.results)) {
        console.error("Open-Meteo geocoding returned an unexpected response format.");
        return providerUnavailable();
      }

      const placeResult = geocodingPayload.results[0];
      if (!isRecord(placeResult)) {
        return NextResponse.json(
          { error: `No matching place was found for "${place}".` },
          { status: 404 }
        );
      }

      if (
        typeof placeResult.name !== "string" ||
        typeof placeResult.country !== "string" ||
        !validCoordinate(placeResult.latitude, -90, 90) ||
        !validCoordinate(placeResult.longitude, -180, 180)
      ) {
        console.error("Open-Meteo geocoding returned an invalid location.");
        return providerUnavailable();
      }

      latitude = placeResult.latitude;
      longitude = placeResult.longitude;
      locationName = placeResult.name;
      admin1 = typeof placeResult.admin1 === "string" ? placeResult.admin1 : null;
      country = placeResult.country;
    }

    const forecastUrl = new URL(FORECAST_URL);
    forecastUrl.searchParams.set("latitude", String(latitude));
    forecastUrl.searchParams.set("longitude", String(longitude));
    forecastUrl.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m"
    );
    forecastUrl.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max"
    );
    forecastUrl.searchParams.set("forecast_days", "7");
    forecastUrl.searchParams.set("timezone", "auto");

    const forecastResponse = await fetch(forecastUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 1_800 },
    });
    if (!forecastResponse.ok) {
      console.error(`Open-Meteo forecast returned HTTP ${forecastResponse.status}.`);
      return providerUnavailable();
    }

    const forecastPayload: unknown = await forecastResponse.json();
    if (
      !isRecord(forecastPayload) ||
      !isRecord(forecastPayload.current) ||
      !isRecord(forecastPayload.daily)
    ) {
      console.error("Open-Meteo forecast returned an unexpected response format.");
      return providerUnavailable();
    }

    const current = forecastPayload.current;
    const daily = forecastPayload.daily;
    const dates = daily.time;
    const weatherCodes = daily.weather_code;
    const maxTemperatures = daily.temperature_2m_max;
    const minTemperatures = daily.temperature_2m_min;
    const precipitation = daily.precipitation_sum;
    const precipitationProbabilities = daily.precipitation_probability_max;

    if (
      typeof current.time !== "string" ||
      !Array.isArray(dates) ||
      !dates.every((date) => typeof date === "string") ||
      !isNullableNumberArray(weatherCodes) ||
      !isNullableNumberArray(maxTemperatures) ||
      !isNullableNumberArray(minTemperatures) ||
      !isNullableNumberArray(precipitation) ||
      !isNullableNumberArray(precipitationProbabilities) ||
      ![
        weatherCodes.length,
        maxTemperatures.length,
        minTemperatures.length,
        precipitation.length,
        precipitationProbabilities.length,
      ].every((length) => length === dates.length)
    ) {
      console.error("Open-Meteo forecast returned invalid current or daily values.");
      return providerUnavailable();
    }

    const forecast: PublicWeatherForecast = {
      sourceUrl: "https://api.open-meteo.com/v1/forecast",
      attributionUrl: "https://open-meteo.com/",
      fetchedAt: new Date().toISOString(),
      location: {
        name: locationName,
        admin1,
        country,
        latitude,
        longitude,
        timezone: typeof forecastPayload.timezone === "string" ? forecastPayload.timezone : "UTC",
      },
      current: {
        time: current.time,
        temperatureC: finiteNumber(current.temperature_2m),
        relativeHumidityPercent: finiteNumber(current.relative_humidity_2m),
        precipitationMm: finiteNumber(current.precipitation),
        weatherCode: finiteNumber(current.weather_code),
        windSpeedKmh: finiteNumber(current.wind_speed_10m),
        windDirectionDegrees: finiteNumber(current.wind_direction_10m),
      },
      daily: dates.map((date, index) => ({
        date,
        weatherCode: weatherCodes[index],
        temperatureMaxC: maxTemperatures[index],
        temperatureMinC: minTemperatures[index],
        precipitationMm: precipitation[index],
        precipitationProbabilityMaxPercent: precipitationProbabilities[index],
      })),
    };

    return NextResponse.json(forecast, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Open-Meteo request failed.", error);
    return providerUnavailable();
  }
}
