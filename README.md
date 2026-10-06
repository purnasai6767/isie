# ISIE_Hack4
Hack_4_Social_Cause

## Geospatial dashboard

The `/geospatial` dashboard uses Mapbox's dark-v11 style and terrain DEM when
`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is configured. Copy `.env.example` to
`.env.local` and add a Mapbox public access token to enable the basemap and 3D
terrain. Without a token, the dashboard shows a setup prompt instead of
pretending a basemap is available.

Hazard columns, carrying-capacity H3 cells, SAR scene outlines, telemetry, and
evacuation paths are illustrative tabletop data. They are not connected to
live satellite, weather, population, or emergency-routing providers.
