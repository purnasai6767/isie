"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Database, ExternalLink, RefreshCw, Search } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { AUTHORITATIVE_SOURCES } from "@/lib/constants/tacticalLayers";
import { useEonetFeed } from "@/lib/hooks/useEonetFeed";
import type { PublicWeatherForecast } from "@/lib/types/publicWeather";
import { useUsgsEarthquakeFeed } from "@/lib/hooks/useUsgsEarthquakeFeed";

function weatherDescription(code: number | null): string {
  if (code === null) return "Condition unavailable";
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snowfall";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code === 95 || code === 96 || code === 99) return "Thunderstorm";
  return "Unknown WMO weather code";
}

function isWeatherForecast(value: unknown): value is PublicWeatherForecast {
  if (typeof value !== "object" || value === null) return false;
  return (
    "fetchedAt" in value &&
    typeof value.fetchedAt === "string" &&
    "location" in value &&
    typeof value.location === "object" &&
    value.location !== null &&
    "current" in value &&
    typeof value.current === "object" &&
    value.current !== null &&
    "daily" in value &&
    Array.isArray(value.daily)
  );
}

export default function SourcesPage() {
  const { feed, error, loading, refresh } = useEonetFeed();
  const usgs = useUsgsEarthquakeFeed();
  const [place, setPlace] = useState("");
  const [forecast, setForecast] = useState<PublicWeatherForecast | null>(null);
  const [weatherError, setWeatherError] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(false);

  const lookupWeather = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setForecast(null);
    setWeatherLoading(true);
    setWeatherError("");
    try {
      const response = await fetch(`/api/public-weather?place=${encodeURIComponent(place.trim())}`);
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : `Weather forecast request failed (HTTP ${response.status}).`;
        throw new Error(message);
      }
      if (!isWeatherForecast(result)) {
        throw new Error("Weather provider returned an unexpected response format.");
      }
      setForecast(result);
    } catch (lookupError) {
      setWeatherError(lookupError instanceof Error ? lookupError.message : "Could not retrieve the forecast.");
    } finally {
      setWeatherLoading(false);
    }
  };

  return (
    <AppShell pageTitle="Data Sources // Public Event Catalogs & Planned Providers">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Connected & Planned Data Sources
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              NASA EONET and USGS provide limited public catalogs, with an on-demand weather-model forecast. National warning, radar, hydrology, and response-provider integrations remain disconnected.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant={error ? "warning" : loading ? "muted" : "cyan"} size="sm">
              3 PUBLIC DATA SERVICES · 6 OFFICIAL PROVIDERS NOT CONNECTED
            </TacticalBadge>
          </div>
        </div>

        {/* Source Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 bg-isie-panel border border-cyan-500/30 rounded-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-semibold text-white">
                  NASA Earth Observatory Natural Event Tracker (EONET)
                </span>
                <TacticalBadge variant={error ? "warning" : loading ? "muted" : "safe"} size="sm">
                  {error ? "UNAVAILABLE" : loading ? "CHECKING" : "CONNECTED"}
                </TacticalBadge>
              </div>
              <div className="font-mono text-[10px] text-isie-cyan mb-2">
                PUBLIC EVENT CATALOG // NASA EONET API v3
              </div>
              <p className="text-xs text-isie-text-secondary leading-relaxed mb-4">
                Open natural-event catalog entries surfaced by NASA EONET. This is not a comprehensive hazard feed, an official emergency alert, or proof that an event is verified. Only point geometry is plotted; event records without a point remain unplotted.
              </p>
              <p role={error ? "alert" : "status"} className="text-[10px] font-mono text-isie-text-dim">
                {error
                  ? error
                  : loading
                    ? "Checking the upstream catalog…"
                    : `${feed?.events.length ?? 0} open catalog entries · retrieved ${feed ? new Date(feed.fetchedAt).toLocaleString(undefined, { timeZone: "UTC", timeZoneName: "short" }) : "—"}`}
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-isie-text-dim">
              <span>UPSTREAM RETRIEVAL · 10-MINUTE CACHE</span>
              <div className="flex items-center gap-3">
                {error && (
                  <button type="button" onClick={refresh} className="flex items-center gap-1 text-amber-200 hover:underline">
                    <RefreshCw className="w-3 h-3" /> RETRY
                  </button>
                )}
                <a
                  href="https://eonet.gsfc.nasa.gov/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-isie-primary hover:underline"
                >
                  <span>NASA EONET</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
          <section className="p-5 bg-isie-panel border border-sky-500/30 rounded-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="font-mono text-xs font-semibold text-white">Open-Meteo Forecast Models</span>
                <TacticalBadge variant="cyan" size="sm">PUBLIC · MODEL FORECAST</TacticalBadge>
              </div>
              <div className="font-mono text-[10px] text-sky-300 mb-2">
                GLOBAL PLACE LOOKUP // CURRENT CONDITIONS + 7-DAY MODEL OUTPUT
              </div>
              <p className="text-xs text-isie-text-secondary leading-relaxed mb-4">
                Weather-model estimates for a place selected below. This is not an official warning, radar observation, or emergency forecast; model coverage and resolution vary by location.
              </p>
              <form onSubmit={lookupWeather} className="flex gap-2">
                <label htmlFor="weather-place" className="sr-only">Place name for forecast lookup</label>
                <input
                  id="weather-place"
                  value={place}
                  onChange={(event) => setPlace(event.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                  placeholder="Enter a city or place"
                  className="min-w-0 flex-1 rounded border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  disabled={weatherLoading}
                  className="inline-flex items-center gap-1.5 rounded border border-sky-400/30 bg-sky-400/10 px-3 py-2 font-mono text-[10px] text-sky-200 hover:bg-sky-400/20 disabled:opacity-50"
                >
                  <Search className="h-3 w-3" />
                  {weatherLoading ? "LOADING" : "LOOK UP"}
                </button>
              </form>
              {weatherError && <p role="alert" className="mt-3 text-[10px] text-amber-200">{weatherError}</p>}
              {forecast && (
                <div className="mt-4 space-y-3">
                  <div className="rounded border border-white/10 bg-white/[0.02] p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="font-mono text-xs font-semibold text-white">
                        {forecast.location.name}{forecast.location.admin1 ? `, ${forecast.location.admin1}` : ""}, {forecast.location.country}
                      </div>
                      <div className="font-mono text-[9px] text-isie-text-dim">{forecast.location.latitude.toFixed(3)}, {forecast.location.longitude.toFixed(3)}</div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono">
                      <span className="text-2xl font-bold text-sky-200">
                        {forecast.current.temperatureC === null ? "—" : `${forecast.current.temperatureC}°C`}
                      </span>
                      <span className="text-xs text-white">{weatherDescription(forecast.current.weatherCode)}</span>
                      <span className="text-[10px] text-isie-text-secondary">
                        Wind {forecast.current.windSpeedKmh === null ? "—" : `${forecast.current.windSpeedKmh} km/h`}
                      </span>
                      <span className="text-[10px] text-isie-text-secondary">
                        Precipitation {forecast.current.precipitationMm === null ? "—" : `${forecast.current.precipitationMm} mm`}
                      </span>
                    </div>
                    <div className="mt-1 text-[9px] text-isie-text-dim">
                      Model time {forecast.current.time} · {forecast.location.timezone} · retrieved {new Date(forecast.fetchedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {forecast.daily.slice(0, 7).map((day) => (
                      <div key={day.date} className="rounded border border-white/5 bg-white/[0.02] p-2 font-mono">
                        <div className="text-[9px] text-isie-text-dim">{day.date}</div>
                        <div className="mt-1 text-[10px] text-white">{weatherDescription(day.weatherCode)}</div>
                        <div className="mt-1 text-[10px] text-sky-200">
                          {day.temperatureMaxC === null || day.temperatureMinC === null
                            ? "—"
                            : `${day.temperatureMinC}° / ${day.temperatureMaxC}°C`}
                        </div>
                        <div className="text-[9px] text-isie-text-secondary">
                          Rain {day.precipitationProbabilityMaxPercent === null ? "—" : `${day.precipitationProbabilityMaxPercent}%`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3 font-mono text-[10px] text-isie-text-dim">
              <span>MODEL OUTPUT · 30-MINUTE CACHE · NO ALERTS</span>
              <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-isie-primary hover:underline">
                OPEN-METEO <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </section>
          <section className="p-5 bg-isie-panel border border-orange-500/30 rounded-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="font-mono text-xs font-semibold text-white">USGS Past-Day Earthquake Feed</span>
                <TacticalBadge variant={usgs.error ? "warning" : usgs.loading ? "muted" : "safe"} size="sm">
                  {usgs.error ? "UNAVAILABLE" : usgs.loading ? "CHECKING" : "CONNECTED"}
                </TacticalBadge>
              </div>
              <div className="font-mono text-[10px] text-orange-300 mb-2">
                PUBLIC GLOBAL CATALOG // PAST 24 HOURS
              </div>
              <p className="text-xs text-isie-text-secondary leading-relaxed mb-4">
                USGS earthquake event feed with source event links and coordinates. It is not a full seismic-impact assessment, local warning service, or complete hazard inventory.
              </p>
              <p role={usgs.error ? "alert" : "status"} className="text-[10px] font-mono text-isie-text-dim">
                {usgs.error
                  ? usgs.error
                  : usgs.loading
                    ? "Checking the upstream feed…"
                    : `${usgs.feed?.events.length ?? 0} events · retrieved ${usgs.feed ? new Date(usgs.feed.fetchedAt).toLocaleString(undefined, { timeZone: "UTC", timeZoneName: "short" }) : "—"}`}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 font-mono text-[10px] text-isie-text-dim">
              <span>UPSTREAM RETRIEVAL · 5-MINUTE CACHE</span>
              <div className="flex items-center gap-3">
                {usgs.error && (
                  <button type="button" onClick={usgs.refresh} className="flex items-center gap-1 text-amber-200 hover:underline">
                    <RefreshCw className="h-3 w-3" /> RETRY
                  </button>
                )}
                <a href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-isie-primary hover:underline">
                  USGS FEED <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </section>
          {AUTHORITATIVE_SOURCES.map((source) => (
            <div
              key={source.id}
              className="p-5 bg-isie-panel border border-white/10 rounded-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold text-white">
                    {source.name}
                  </span>
                  <TacticalBadge variant="muted" size="sm">
                    STANDBY
                  </TacticalBadge>
                </div>
                <div className="font-mono text-[10px] text-isie-cyan mb-2">
                  {source.type} // {source.code}
                </div>
                <p className="text-xs text-isie-text-secondary leading-relaxed mb-4">
                  {source.description}
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-isie-text-dim">
                <span>INGESTION STATUS: DISCONNECTED</span>
                <a
                  href={source.referenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-isie-primary hover:underline"
                >
                  <span>PORTAL</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
