# ISIE

ISIE is a spatial intelligence dashboard prototype. Incident and resource
records saved by authenticated users are workspace submissions, not
independently verified public-safety data. No authoritative hazard, weather,
population, shelter-capacity, or road-status provider is connected by default.

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

The `/global` map supports worldwide map navigation and place search; this does
not imply worldwide incident coverage. The `/geospatial` scenario visualization
is explicitly a tabletop simulation. Simulated hazard columns, H3 cells,
routes, telemetry, and timeline frames are not operational data.

## Firestore data

The Firebase app and Firestore database ID are configured in
`firebase-applet-config.json`. Authenticated workspace incident reports,
timeline entries, notifications, user profiles, tactical logs, and response
resource records are stored in Firestore. New accounts receive the `VIEWER`
role; an administrator must grant additional roles through a trusted
administrative process. The browser app cannot grant itself operator access.

Firestore rules are in `firestore.rules`. Review the target Firebase project
and database before deploying them with Firebase CLI. `firebase.json` targets
the `(default)` database used by the client configuration. After signing in to
the configured Firebase project, deploy with
`npx firebase-tools deploy --only firestore:rules --project gen-lang-client-0164916426`.
Rules deployment changes remote access control. Workspace values are not
independently verified simply because they are stored in Firestore. Do not add
private API keys to source control.
