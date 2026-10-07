# ISIE

ISIE is a spatial intelligence dashboard prototype. Incident and resource
records saved by authenticated users are workspace submissions, not
independently verified public-safety data. No national hazard, official warning,
population, shelter-capacity, or road-status provider is connected.

## Geospatial dashboard

Copy `.env.example` to `.env.local` for local development. `GEMINI_API_KEY` is
server-only and must never use a `NEXT_PUBLIC_` prefix. The Google Search,
Maps Grounding, and transcription API routes read it on the server. Mapbox and
Google Maps browser keys are public client keys; restrict them by website,
API, and quota in their provider consoles.

The dashboard uses Mapbox's dark-v11 style and terrain DEM when
`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is configured. Without a token, the globe
uses published Esri imagery tiles, and the `/geospatial` dashboard shows a
provider setup prompt rather than claiming a live feed.

The `/global` view uses a real, interactive globe and published satellite-map
tiles. It uses Mapbox satellite imagery and terrain when the token is
configured, and Esri satellite tiles as a no-token imagery fallback. Satellite
tiles are not a live sensor feed and may not represent current ground
conditions.

The `/global` and `/sources` views retrieve NASA's public EONET v3 open-event
catalog through `/api/nasa-eonet`, cached for up to 10 minutes. Event source
links and retrieval time are shown in the UI. Only events with valid point
geometry appear as map markers; other catalog entries remain in the list.
EONET is a limited natural-event catalog, not comprehensive incident coverage,
an emergency alert service, or proof of current ground conditions. Upstream
errors appear as unavailable rather than being replaced with synthetic events.

The `/global` and `/sources` views also retrieve the USGS past-day earthquake
GeoJSON catalog through `/api/usgs-earthquakes`, cached for up to five minutes.
Catalog event locations link to USGS records and are displayed separately from
user-submitted reports. The feed is not a seismic impact assessment, local
warning service, or complete hazard inventory.

The `/sources` page also provides on-demand place lookup and current/7-day
weather-model forecasts through `/api/public-weather`. Forecast responses are
validated, cached briefly, and include the provider retrieval time. Open-Meteo
combines public weather model outputs; forecasts are not official warnings,
radar observations, or verified ground conditions. Coverage and model resolution
vary by location. The free API is limited to non-commercial use and requires
attribution; see [Open-Meteo's terms and attribution](https://open-meteo.com/en/terms).

The `/global` map supports worldwide map navigation and place search through
Mapbox when configured, with public Open-Meteo geocoding as the no-token
fallback. Place search coverage is not incident coverage. The `/geospatial`
scenario visualization is explicitly a tabletop simulation. Simulated hazard
columns, H3 cells, routes, telemetry, and timeline frames are not operational
data.

## Firestore data

The Firebase app and Firestore database ID are configured in
`firebase-applet-config.json`. Authenticated workspace incident reports,
timeline entries, notifications, user profiles, tactical logs, and response
resource records are stored in Firestore. New accounts receive the `VIEWER`
role; an administrator must grant additional roles through a trusted
administrative process. The browser app cannot grant itself operator access.

Sign-in and account creation use Firebase Authentication only. There is no
demo credential, local-storage identity, or client-side path that can mark an
unauthenticated visitor as signed in. Public browsing does not create an
account; clearly labeled tabletop simulations remain synthetic and must not
be treated as real incident, shelter, route, or warning data.

Firestore rules are in `firestore.rules`. `firebase.json` targets the named
database configured by `firestoreDatabaseId` in `firebase-applet-config.json`.
After signing in to the configured Firebase project, deploy with
`npx firebase-tools deploy --only firestore:rules --project gen-lang-client-0164916426`.
Rules deployment changes remote access control. Workspace values are not
independently verified simply because they are stored in Firestore. Do not add
private API keys to source control.
