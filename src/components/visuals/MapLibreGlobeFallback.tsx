"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import Map, { Marker, NavigationControl, Popup, ScaleControl, type MapRef } from "react-map-gl/maplibre";
import { setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import type { IntelligenceEvent } from "@/lib/types/isie";
import type { EonetEvent } from "@/lib/types/eonet";
import type { UsgsEarthquake } from "@/lib/types/usgs";

setWorkerUrl("/maplibre-gl-worker.mjs");

export interface GlobeCameraHandle {
  flyTo(options: {
    center: [number, number];
    zoom: number;
    pitch?: number;
    bearing?: number;
    duration?: number;
    essential?: boolean;
  }): void;
  getZoom(): number;
}

interface MapLibreGlobeFallbackProps {
  center: [number, number];
  zoom: number;
  pitch: number;
  surface: "SATELLITE" | "TACTICAL" | "NIGHT";
  incidents: IntelligenceEvent[];
  eonetEvents: EonetEvent[];
  earthquakes: UsgsEarthquake[];
  selectedIncidentId: string | null;
  selectedEonetId: string | null;
  selectedEarthquakeId: string | null;
  onSelectIncident: (event: IntelligenceEvent | null) => void;
  onSelectEonetEvent: (event: EonetEvent | null) => void;
  onSelectEarthquake: (event: UsgsEarthquake | null) => void;
  onLoad: () => void;
}

const MapLibreGlobeFallback = forwardRef<GlobeCameraHandle, MapLibreGlobeFallbackProps>(
  function MapLibreGlobeFallback({
    center,
    zoom,
    pitch,
    surface,
    incidents,
    eonetEvents,
    earthquakes,
    selectedIncidentId,
    selectedEonetId,
    selectedEarthquakeId,
    onSelectIncident,
    onSelectEonetEvent,
    onSelectEarthquake,
    onLoad,
  }, ref) {
    const mapRef = useRef<MapRef>(null);
    const [popup, setPopup] = useState<
      | { kind: "incident"; id: string }
      | { kind: "eonet"; id: string }
      | { kind: "earthquake"; id: string }
      | null
    >(null);

    useImperativeHandle(ref, () => ({
      flyTo: (options) => mapRef.current?.flyTo(options),
      getZoom: () => mapRef.current?.getZoom() ?? zoom,
    }), [zoom]);

    const mapStyle = useMemo((): StyleSpecification => {
      if (surface === "SATELLITE") {
        return {
          version: 8,
          sources: {
            imagery: {
              type: "raster",
              tiles: ["/api/map-tiles/esri-imagery/{z}/{x}/{y}"],
              tileSize: 256,
              attribution: "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
              maxzoom: 19,
            },
            labels: {
              type: "raster",
              tiles: ["/api/map-tiles/esri-labels/{z}/{x}/{y}"],
              tileSize: 256,
              attribution: "Boundaries and place names © Esri",
              maxzoom: 19,
            },
          },
          layers: [
            { id: "imagery", type: "raster", source: "imagery" },
            { id: "labels", type: "raster", source: "labels", paint: { "raster-opacity": 0.95 } },
          ],
        };
      }

      if (surface === "TACTICAL") {
        return {
          version: 8,
          sources: {
            carto: {
              type: "raster",
              tiles: ["/api/map-tiles/carto/{z}/{x}/{y}"],
              tileSize: 256,
              attribution: "© CARTO © OpenStreetMap contributors",
              maxzoom: 20,
            },
          },
          layers: [{ id: "carto-dark", type: "raster", source: "carto" }],
        };
      }

      return {
        version: 8,
        sources: {
          streets: {
            type: "raster",
            tiles: ["/api/map-tiles/esri-streets/{z}/{x}/{y}"],
            tileSize: 256,
            attribution: "Map data and tiles © Esri",
            maxzoom: 19,
          },
        },
        layers: [{ id: "streets", type: "raster", source: "streets" }],
      };
    }, [surface]);

    const selectedIncident = incidents.find((item) => item.id === (popup?.kind === "incident" ? popup.id : ""));
    const selectedEonet = eonetEvents.find((item) => item.id === (popup?.kind === "eonet" ? popup.id : ""));
    const selectedEarthquake = earthquakes.find((item) => item.id === (popup?.kind === "earthquake" ? popup.id : ""));

    const marker = (color: string, label: string) => (
      <span
        aria-label={label}
        className="block h-3.5 w-3.5 rounded-full border-2 border-white shadow-[0_0_12px_rgba(0,0,0,0.8)]"
        style={{ backgroundColor: color }}
      />
    );

    return (
      <Map
        ref={mapRef}
        mapStyle={mapStyle}
        projection="globe"
        initialViewState={{
          longitude: center[0],
          latitude: center[1],
          zoom,
          pitch,
          bearing: 0,
        }}
        minZoom={0.7}
        maxZoom={18}
        maxPitch={70}
        onLoad={onLoad}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        reuseMaps
      >
        <NavigationControl position="bottom-right" showCompass showZoom />
        <ScaleControl position="bottom-left" unit="metric" />
        {incidents.map((incident) => (
          <Marker
            key={`incident-${incident.id}`}
            longitude={incident.coordinates.lng}
            latitude={incident.coordinates.lat}
            anchor="center"
            onClick={(event) => {
              event.originalEvent.stopPropagation();
              onSelectIncident(incident);
              setPopup({ kind: "incident", id: incident.id });
            }}
          >
            {marker("#38d5e6", incident.title)}
          </Marker>
        ))}
        {eonetEvents.map((event) => event.location && (
          <Marker
            key={`eonet-${event.id}`}
            longitude={event.location.longitude}
            latitude={event.location.latitude}
            anchor="center"
            onClick={(click) => {
              click.originalEvent.stopPropagation();
              onSelectEonetEvent(event);
              setPopup({ kind: "eonet", id: event.id });
            }}
          >
            {marker("#fbbf24", event.title)}
          </Marker>
        ))}
        {earthquakes.map((event) => (
          <Marker
            key={`earthquake-${event.id}`}
            longitude={event.coordinates.longitude}
            latitude={event.coordinates.latitude}
            anchor="center"
            onClick={(click) => {
              click.originalEvent.stopPropagation();
              onSelectEarthquake(event);
              setPopup({ kind: "earthquake", id: event.id });
            }}
          >
            {marker("#fb923c", event.place)}
          </Marker>
        ))}
        {selectedIncident && popup?.kind === "incident" && (
          <Popup
            longitude={selectedIncident.coordinates.lng}
            latitude={selectedIncident.coordinates.lat}
            anchor="bottom"
            onClose={() => setPopup(null)}
          >
            <strong>{selectedIncident.title}</strong>
          </Popup>
        )}
        {selectedEonet?.location && popup?.kind === "eonet" && (
          <Popup
            longitude={selectedEonet.location.longitude}
            latitude={selectedEonet.location.latitude}
            anchor="bottom"
            onClose={() => setPopup(null)}
          >
            <strong>{selectedEonet.title}</strong>
          </Popup>
        )}
        {selectedEarthquake && popup?.kind === "earthquake" && (
          <Popup
            longitude={selectedEarthquake.coordinates.longitude}
            latitude={selectedEarthquake.coordinates.latitude}
            anchor="bottom"
            onClose={() => setPopup(null)}
          >
            <strong>{selectedEarthquake.place}</strong>
          </Popup>
        )}
      </Map>
    );
  }
);

export default MapLibreGlobeFallback;
