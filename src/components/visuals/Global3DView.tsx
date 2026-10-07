"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Radio,
  Compass,
  Layers,
  AlertTriangle,
  Move,
  Info,
  Maximize2,
  Minimize2,
  Navigation,
  Crosshair,
  MapPin,
  Eye,
  X,
  Globe,
  Shield,
  Sun,
  Moon,
} from "lucide-react";
import { TacticalBadge } from "../ui/TacticalBadge";
import {
  CONTINENTS,
  COUNTRIES,
  INDIAN_STATES,
  STRATEGIC_CITIES,
  WATER_BODIES,
  RIVERS_DATA,
  INDIA_BORDER_COORDINATES,
  GLOBAL_COASTLINE_SEGS,
  GeoPoint,
} from "@/data/geospatial/spatialData";
import { IntelligenceEvent } from "@/lib/types/isie";

interface Global3DViewProps {
  className?: string;
  showOverlay?: boolean;
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: IntelligenceEvent | null) => void;
  incidents?: IntelligenceEvent[];
}

// Convert geographic coordinates (lat, lon) to 3D Cartesian Vector on a sphere of radius R
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Helper to compute shortest angular distance between two radian angles
function shortestAngleDiff(target: number, current: number): number {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

// Procedural high-contrast fallback canvas in case texture decoding takes a frame
function createProceduralEarthCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Rich deep oceanic blue gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, 512);
  oceanGrad.addColorStop(0, "#081d38");
  oceanGrad.addColorStop(0.5, "#0b2648");
  oceanGrad.addColorStop(1, "#081d38");
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Continental landmasses (natural green & earth tones)
  ctx.fillStyle = "#1e4d34";
  // Eurasia
  ctx.beginPath();
  ctx.ellipse(650, 180, 200, 95, 0, 0, Math.PI * 2);
  ctx.fill();
  // Africa
  ctx.fillStyle = "#334b28";
  ctx.beginPath();
  ctx.ellipse(540, 280, 85, 110, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // North America
  ctx.fillStyle = "#264834";
  ctx.beginPath();
  ctx.ellipse(240, 180, 110, 85, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // South America
  ctx.beginPath();
  ctx.ellipse(320, 340, 65, 105, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Australia
  ctx.fillStyle = "#3a4628";
  ctx.beginPath();
  ctx.ellipse(820, 360, 60, 45, 0, 0, Math.PI * 2);
  ctx.fill();
  // Antarctica
  ctx.fillStyle = "#b4c8d8";
  ctx.fillRect(0, 470, 1024, 42);

  return canvas;
}

function createProceduralNightCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#020408";
  ctx.fillRect(0, 0, 1024, 512);

  ctx.fillStyle = "#071020";
  ctx.beginPath();
  ctx.ellipse(650, 180, 200, 95, 0, 0, Math.PI * 2);
  ctx.ellipse(540, 280, 85, 110, 0.2, 0, Math.PI * 2);
  ctx.ellipse(240, 180, 110, 85, -0.2, 0, Math.PI * 2);
  ctx.ellipse(320, 340, 65, 105, 0.3, 0, Math.PI * 2);
  ctx.ellipse(820, 360, 60, 45, 0, 0, Math.PI * 2);
  ctx.fill();

  const lightClusters: [number, number, number][] = [
    [725, 215, 20], [715, 235, 16], [730, 255, 16], [745, 230, 14], [732, 265, 14],
    [810, 195, 25], [840, 190, 22], [790, 230, 20],
    [560, 160, 30], [580, 170, 25], [540, 175, 20],
    [260, 170, 35], [210, 180, 25], [280, 195, 25],
    [640, 210, 15], [660, 215, 12],
  ];

  lightClusters.forEach(([cx, cy, count]) => {
    for (let i = 0; i < count; i++) {
      const rx = cx + (Math.sin(i * 99) * 22);
      const ry = cy + (Math.cos(i * 77) * 18);
      const radius = 0.8 + ((i % 3) * 0.4);
      ctx.beginPath();
      ctx.arc(rx, ry, radius, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? "#fef08a" : "#f59e0b";
      ctx.fill();
    }
  });

  return canvas;
}

function createProceduralCloudCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, 1024, 512);

  ctx.fillStyle = "rgba(255, 255, 255, 0.38)";
  const cloudBands: [number, number, number, number][] = [
    [512, 160, 480, 24],
    [512, 260, 500, 30],
    [512, 380, 460, 22],
  ];

  cloudBands.forEach(([cx, cy, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  for (let i = 0; i < 40; i++) {
    const x = ((i * 25.6) + 40) % 1024;
    const y = 80 + ((i * 19.3) % 320);
    const w = 35 + ((i * 7) % 40);
    const h = 12 + ((i * 3) % 15);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.12 + ((i % 5) * 0.04)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

// Geographic Focus Presets
interface FocusTarget {
  id: string;
  label: string;
  lat: number;
  lon: number;
  dist: number;
  description: string;
}

const FOCUS_PRESETS: FocusTarget[] = [
  { id: "INDIA", label: "INDIA", lat: 22.5, lon: 78.9, dist: 98, description: "India map view" },
  { id: "GLOBAL", label: "GLOBAL VIEW", lat: 20.0, lon: 40.0, dist: 185, description: "Planetary Geospatial Overview" },
  { id: "CHAMOLI", label: "CHAMOLI", lat: 30.55, lon: 79.56, dist: 68, description: "Chamoli, India" },
  { id: "ASSAM", label: "BRAHMAPUTRA", lat: 26.68, lon: 93.35, dist: 68, description: "Brahmaputra region, India" },
  { id: "CYCLONE", label: "BAY OF BENGAL", lat: 19.81, lon: 85.83, dist: 70, description: "Bay of Bengal map view" },
  { id: "HQ", label: "DELHI", lat: 28.61, lon: 77.21, dist: 67, description: "Delhi, India" },
];

export const Global3DView: React.FC<Global3DViewProps> = ({
  className = "",
  showOverlay = true,
  selectedIncidentId = null,
  onSelectIncident,
  incidents,
}) => {
  const activeIncidents = incidents ?? [];
  const mountRef = useRef<HTMLDivElement>(null);
  const labelCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState("1.0X");
  const [activePreset, setActivePreset] = useState("INDIA");
  const [surfaceStyle, setSurfaceStyle] = useState<"SATELLITE" | "TACTICAL" | "NIGHT">("SATELLITE");
  const [selectedIncident, setSelectedIncident] = useState<IntelligenceEvent | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);

  // Surface style ref for animation loop / texture swap
  const surfaceStyleRef = useRef(surfaceStyle);
  useEffect(() => {
    surfaceStyleRef.current = surfaceStyle;
  }, [surfaceStyle]);

  // Layer Visibility
  const [layerVisibility, setLayerVisibility] = useState({
    continents: true,
    countries: true,
    states: true,
    rivers: true,
    cities: true,
    incidents: true,
    clouds: true,
    orbits: true,
  });

  const toggleLayer = (key: keyof typeof layerVisibility) => {
    setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Controller hook exposed to UI buttons
  const controlsRef = useRef<{
    reset: () => void;
    zoom: (delta: number) => void;
    toggleAutoRotate: () => void;
    focus: (lat: number, lon: number, dist: number, presetId?: string) => void;
    setSurface: (style: "SATELLITE" | "TACTICAL" | "NIGHT") => void;
  } | null>(null);

  // Sync external selected incident
  useEffect(() => {
    if (selectedIncidentId) {
      const inc = activeIncidents.find((i) => i.id === selectedIncidentId);
      if (inc) {
        setSelectedIncident(inc);
        controlsRef.current?.focus(inc.coordinates.lat, inc.coordinates.lng, 69, inc.id);
      }
    }
  }, [selectedIncidentId, activeIncidents]);

  useEffect(() => {
    if (!mountRef.current || !labelCanvasRef.current) return;
    const container = mountRef.current;
    const labelCanvas = labelCanvasRef.current;
    let width = container.clientWidth || 800;
    let height = container.clientHeight || 500;

    // High DPI scaling for crisp text on label canvas
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    labelCanvas.width = width * dpr;
    labelCanvas.height = height * dpr;
    const ctx = labelCanvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    // --- 1. Three.js Scene Setup ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070b, 0.0016);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.2, 2200);

    const GLOBE_RADIUS = 60;
    const MIN_DISTANCE = 64;
    const MAX_DISTANCE = 220;

    // Default configuration: Centered cleanly on Indian Subcontinent (lat 22.5, lon 78.9)
    const DEFAULT_CONFIG = {
      rotX: 0.38,
      rotY: -1.45,
      distance: 98,
      panX: 0,
      panY: 0,
      panZ: 0,
    };

    const state = {
      currentRotX: DEFAULT_CONFIG.rotX,
      targetRotX: DEFAULT_CONFIG.rotX,
      currentRotY: DEFAULT_CONFIG.rotY,
      targetRotY: DEFAULT_CONFIG.rotY,
      currentDist: DEFAULT_CONFIG.distance,
      targetDist: DEFAULT_CONFIG.distance,
      currentPan: new THREE.Vector3(0, 0, 0),
      targetPan: new THREE.Vector3(0, 0, 0),
      autoRotate: isRotating,
      lastInteractionTime: 0,
    };

    // --- 2. High-Performance WebGL Renderer ---
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x05070b, 0);
    container.appendChild(renderer.domElement);

    const rootSystem = new THREE.Group();
    scene.add(rootSystem);

    const earthGroup = new THREE.Group();
    rootSystem.add(earthGroup);

    // --- 3. Planetary Textures (High-Resolution Procedural Geospatial Textures) ---
    const dayCanvas = createProceduralEarthCanvas();
    const dayTexture = new THREE.CanvasTexture(dayCanvas);
    dayTexture.colorSpace = THREE.SRGBColorSpace;

    const nightCanvas = createProceduralNightCanvas();
    const nightTexture = new THREE.CanvasTexture(nightCanvas);
    nightTexture.colorSpace = THREE.SRGBColorSpace;

    const cloudsCanvas = createProceduralCloudCanvas();
    const cloudsTexture = new THREE.CanvasTexture(cloudsCanvas);
    cloudsTexture.colorSpace = THREE.SRGBColorSpace;

    // Core Earth Sphere
    const sphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const sphereMat = new THREE.MeshBasicMaterial({
      map: dayTexture,
      color: 0xffffff,
    });
    const coreSphere = new THREE.Mesh(sphereGeo, sphereMat);
    earthGroup.add(coreSphere);

    // Cloud Layer
    const cloudGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.006, 48, 48);
    const cloudMat = new THREE.MeshBasicMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    earthGroup.add(cloudMesh);

    // --- 4. Tactical Graticule (Lat/Lon Grid) ---
    const graticuleGroup = new THREE.Group();
    earthGroup.add(graticuleGroup);

    // Latitudes (every 30 degrees)
    for (let lat = -60; lat <= 60; lat += 30) {
      const radiusAtLat = GLOBE_RADIUS * Math.cos((lat * Math.PI) / 180);
      const yAtLat = GLOBE_RADIUS * Math.sin((lat * Math.PI) / 180);
      const latRingCurve = new THREE.EllipseCurve(0, 0, radiusAtLat, radiusAtLat, 0, Math.PI * 2, false, 0);
      const latPts = latRingCurve.getPoints(64).map((p) => new THREE.Vector3(p.x, yAtLat, p.y));
      const latGeo = new THREE.BufferGeometry().setFromPoints(latPts);
      const isEquator = lat === 0;
      const latMat = new THREE.LineBasicMaterial({
        color: isEquator ? 0x00f2fe : 0x38bdf8,
        transparent: true,
        opacity: isEquator ? 0.45 : 0.12,
      });
      graticuleGroup.add(new THREE.Line(latGeo, latMat));
    }

    // Longitudes (every 30 degrees)
    for (let lon = 0; lon < 360; lon += 30) {
      const lonPts: THREE.Vector3[] = [];
      const radLon = (lon * Math.PI) / 180;
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI - Math.PI / 2;
        lonPts.push(
          new THREE.Vector3(
            GLOBE_RADIUS * Math.cos(theta) * Math.cos(radLon),
            GLOBE_RADIUS * Math.sin(theta),
            GLOBE_RADIUS * Math.cos(theta) * Math.sin(radLon)
          )
        );
      }
      const lonGeo = new THREE.BufferGeometry().setFromPoints(lonPts);
      const isPrime = lon === 0 || lon === 180;
      const lonMat = new THREE.LineBasicMaterial({
        color: isPrime ? 0x38bdf8 : 0x38bdf8,
        transparent: true,
        opacity: isPrime ? 0.35 : 0.1,
      });
      graticuleGroup.add(new THREE.Line(lonGeo, lonMat));
    }

    // --- 5. Global Continental Coastlines & Vector Boundaries ---
    const coastlineGroup = new THREE.Group();
    earthGroup.add(coastlineGroup);

    GLOBAL_COASTLINE_SEGS.forEach((seg) => {
      const pts = seg.map(([lat, lon]) => latLonToVector3(lat, lon, GLOBE_RADIUS * 1.002));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
      });
      coastlineGroup.add(new THREE.Line(geo, mat));
    });

    // --- 6. India National Perimeter Vector (Prominent Tactical Cyan Border) ---
    const indiaBorderGroup = new THREE.Group();
    earthGroup.add(indiaBorderGroup);

    const indiaPts = INDIA_BORDER_COORDINATES.map(([lat, lon]) =>
      latLonToVector3(lat, lon, GLOBE_RADIUS * 1.005)
    );
    const indiaGeo = new THREE.BufferGeometry().setFromPoints(indiaPts);
    const indiaMat = new THREE.LineBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.95,
      linewidth: 2,
    });
    const indiaLine = new THREE.Line(indiaGeo, indiaMat);
    indiaBorderGroup.add(indiaLine);

    // Subtle internal territory lines connecting Indian state nodes
    const internalStateGroup = new THREE.Group();
    earthGroup.add(internalStateGroup);

    // Selected state adjacency links to form GIS-style state polygons
    const STATE_LINKS: [string, string][] = [
      ["JK", "LA"], ["JK", "HP"], ["HP", "UK"], ["PB", "HR"], ["HR", "UK"],
      ["HR", "DL"], ["DL", "UP"], ["RJ", "UP"], ["RJ", "MP"], ["RJ", "GJ"],
      ["UP", "MP"], ["UP", "BR"], ["BR", "JH"], ["BR", "WB"], ["WB", "SK"],
      ["WB", "AS"], ["AS", "AR"], ["AS", "NL"], ["NL", "MN"], ["MN", "MZ"],
      ["MZ", "TR"], ["AS", "ML"], ["JH", "OD"], ["JH", "CG"], ["MP", "CG"],
      ["MP", "MH"], ["GJ", "MH"], ["MH", "GA"], ["MH", "KA"], ["MH", "TG"],
      ["CG", "OD"], ["OD", "AP"], ["TG", "AP"], ["KA", "TG"], ["KA", "AP"],
      ["KA", "KL"], ["KA", "TN"], ["AP", "TN"], ["KL", "TN"],
    ];

    STATE_LINKS.forEach(([c1, c2]) => {
      const s1 = INDIAN_STATES.find((s) => s.code === c1);
      const s2 = INDIAN_STATES.find((s) => s.code === c2);
      if (s1 && s2) {
        const p1 = latLonToVector3(s1.lat, s1.lon, GLOBE_RADIUS * 1.003);
        const p2 = latLonToVector3(s2.lat, s2.lon, GLOBE_RADIUS * 1.003);
        const linkGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const linkMat = new THREE.LineDashedMaterial({
          color: 0x38bdf8,
          dashSize: 1.5,
          gapSize: 1.5,
          transparent: true,
          opacity: 0.35,
        });
        const line = new THREE.Line(linkGeo, linkMat);
        line.computeLineDistances();
        internalStateGroup.add(line);
      }
    });

    // --- 7. Major Indian Rivers (3D Hydrological Vector Arcs) ---
    const riversGroup = new THREE.Group();
    earthGroup.add(riversGroup);

    RIVERS_DATA.forEach((river) => {
      const pts = river.points.map(([lat, lon]) => latLonToVector3(lat, lon, GLOBE_RADIUS * 1.004));
      const rGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const rMat = new THREE.LineBasicMaterial({
        color: 0x00f2fe,
        transparent: true,
        opacity: 0.8,
      });
      riversGroup.add(new THREE.Line(rGeo, rMat));
    });

    // --- 8. ISIE Incident Beacons & Pulsing Telemetry Pins ---
    const incidentGroup = new THREE.Group();
    earthGroup.add(incidentGroup);

    interface PulseRing {
      mesh: THREE.Mesh;
      speed: number;
    }
    const pulseRings: PulseRing[] = [];

    activeIncidents.forEach((inc) => {
      const isCritical = inc.severity === "CRITICAL";
      const isHigh = inc.severity === "HIGH";
      const colHex = isCritical ? 0xef4444 : isHigh ? 0xf59e0b : 0x38bdf8;
      const pos = latLonToVector3(inc.coordinates.lat, inc.coordinates.lng, GLOBE_RADIUS * 1.005);
      const normal = pos.clone().normalize();

      // Beacon Dot
      const bGeo = new THREE.SphereGeometry(1.2, 14, 14);
      const bMat = new THREE.MeshBasicMaterial({ color: colHex });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.copy(pos);
      incidentGroup.add(bMesh);

      // Elevated Stem Pin
      const stemHeight = isCritical ? 6.0 : 4.5;
      const stemTop = pos.clone().add(normal.clone().multiplyScalar(stemHeight));
      const stemGeo = new THREE.BufferGeometry().setFromPoints([pos, stemTop]);
      const stemMat = new THREE.LineBasicMaterial({
        color: colHex,
        transparent: true,
        opacity: 0.85,
      });
      incidentGroup.add(new THREE.Line(stemGeo, stemMat));

      // Head Pin Sphere
      const headGeo = new THREE.SphereGeometry(0.85, 12, 12);
      const headMat = new THREE.MeshBasicMaterial({ color: colHex });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.position.copy(stemTop);
      incidentGroup.add(headMesh);

      // Surface Pulsing Waveform Ring
      const rGeo = new THREE.RingGeometry(1.4, 2.2, 24);
      const rMat = new THREE.MeshBasicMaterial({
        color: colHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.position.copy(pos.clone().add(normal.clone().multiplyScalar(0.05)));
      rMesh.lookAt(pos.clone().add(normal));
      incidentGroup.add(rMesh);

      pulseRings.push({
        mesh: rMesh,
        speed: isCritical ? 2.4 : 1.4,
      });
    });

    // National Command HQ (New Delhi)
    const hqPos = latLonToVector3(28.6139, 77.209, GLOBE_RADIUS * 1.005);
    const hqNormal = hqPos.clone().normalize();
    const hqTop = hqPos.clone().add(hqNormal.clone().multiplyScalar(5.5));
    const hqStemGeo = new THREE.BufferGeometry().setFromPoints([hqPos, hqTop]);
    const hqStemMat = new THREE.LineBasicMaterial({ color: 0x00f2fe, opacity: 0.85, transparent: true });
    incidentGroup.add(new THREE.Line(hqStemGeo, hqStemMat));

    const hqHeadGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const hqHeadMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const hqHead = new THREE.Mesh(hqHeadGeo, hqHeadMat);
    hqHead.position.copy(hqTop);
    incidentGroup.add(hqHead);

    // --- 9. Tactical Evacuation & Supply Arcs (Chamoli to Rishikesh) ---
    const corridorGroup = new THREE.Group();
    earthGroup.add(corridorGroup);

    const pChamoli = latLonToVector3(30.5541, 79.5663, GLOBE_RADIUS * 1.006);
    const pRishikesh = latLonToVector3(30.0869, 78.2676, GLOBE_RADIUS * 1.006);
    const mid1 = pChamoli.clone().add(pRishikesh).multiplyScalar(0.5);
    const dist1 = pChamoli.distanceTo(pRishikesh);
    const arcPeak1 = mid1.clone().add(mid1.clone().normalize().multiplyScalar(dist1 * 0.45 + 2.0));
    const curve1 = new THREE.QuadraticBezierCurve3(pChamoli, arcPeak1, pRishikesh);
    const arcGeo1 = new THREE.BufferGeometry().setFromPoints(curve1.getPoints(32));
    const arcMat1 = new THREE.LineDashedMaterial({
      color: 0xff7a18,
      dashSize: 2,
      gapSize: 1.5,
      transparent: true,
      opacity: 0.85,
    });
    const arcLine1 = new THREE.Line(arcGeo1, arcMat1);
    arcLine1.computeLineDistances();
    corridorGroup.add(arcLine1);

    // --- 10. Satellite Orbit Track & Recon Payload ---
    const orbitGroup = new THREE.Group();
    earthGroup.add(orbitGroup);

    const orbitRadiusX = GLOBE_RADIUS * 1.34;
    const orbitRadiusZ = GLOBE_RADIUS * 1.26;
    const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadiusX, orbitRadiusZ, 0, Math.PI * 2, false, 0);
    const orbitPts = orbitCurve.getPoints(96).map((p) => new THREE.Vector3(p.x, p.y * 0.38, p.y));
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
    const orbitMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 3,
      gapSize: 3,
      transparent: true,
      opacity: 0.35,
    });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    orbitLine.computeLineDistances();
    orbitGroup.add(orbitLine);

    const satMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.9, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    orbitGroup.add(satMesh);

    // Atmospheric Glow Halo
    const haloGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.028, 48, 48);
    const haloMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.72 - dot(vNormal, vec3(0, 0, 1.0)), 2.2);
          gl_FragColor = vec4(0.0, 0.88, 1.0, 1.0) * intensity * 0.42;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    scene.add(haloMesh);

    // --- 11. Interactive Camera & Pointer Controls ---
    let isDragging = false;
    let dragMode: "rotate" | "pan" = "rotate";
    let prevMouse = { x: 0, y: 0 };
    let startMouse = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      state.lastInteractionTime = performance.now();
      if (state.autoRotate) {
        state.autoRotate = false;
        setIsRotating(false);
      }
      dragMode = e.button === 2 || e.shiftKey ? "pan" : "rotate";
      prevMouse = { x: e.clientX, y: e.clientY };
      startMouse = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      state.lastInteractionTime = performance.now();
      const deltaX = e.clientX - prevMouse.x;
      const deltaY = e.clientY - prevMouse.y;

      if (dragMode === "rotate") {
        state.targetRotY += deltaX * 0.0055;
        state.targetRotX = Math.max(
          -Math.PI / 2.3,
          Math.min(Math.PI / 2.3, state.targetRotX + deltaY * 0.0055)
        );
      } else {
        const panFactor = state.currentDist * 0.0012;
        state.targetPan.x -= deltaX * panFactor;
        state.targetPan.y += deltaY * panFactor;
      }
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const dragDist = Math.hypot(e.clientX - startMouse.x, e.clientY - startMouse.y);
      isDragging = false;

      // Click detection: If user clicked without dragging, check for incident pin selection
      if (dragDist < 6 && e.button === 0) {
        const rect = renderer.domElement.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        let matched: IntelligenceEvent | null = null;
        let closestDist = 24;

        for (const inc of activeIncidents) {
          const pos = latLonToVector3(inc.coordinates.lat, inc.coordinates.lng, GLOBE_RADIUS * 1.008);
          const normal = pos.clone().normalize();
          if (normal.dot(camera.position.clone().normalize()) > 0.2) {
            const proj = pos.clone().project(camera);
            const sx = (proj.x * 0.5 + 0.5) * width;
            const sy = (-(proj.y * 0.5) + 0.5) * height;
            const d = Math.hypot(clickX - sx, clickY - sy);
            if (d < closestDist) {
              closestDist = d;
              matched = inc;
            }
          }
        }

        if (matched) {
          const targetInc: IntelligenceEvent = matched;
          setSelectedIncident(targetInc);
          if (onSelectIncident) onSelectIncident(targetInc);
          focusLocation(targetInc.coordinates.lat, targetInc.coordinates.lng, 69, targetInc.id);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      state.lastInteractionTime = performance.now();
      if (state.autoRotate) {
        state.autoRotate = false;
        setIsRotating(false);
      }
      const zoomFactor = e.deltaY * 0.12;
      state.targetDist = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, state.targetDist + zoomFactor));
    };

    const resetCamera = () => {
      state.lastInteractionTime = performance.now();
      state.targetRotX = DEFAULT_CONFIG.rotX;
      state.targetRotY = DEFAULT_CONFIG.rotY;
      state.targetDist = DEFAULT_CONFIG.distance;
      state.targetPan.set(0, 0, 0);
      setActivePreset("INDIA");
      setSelectedIncident(null);
      if (onSelectIncident) onSelectIncident(null);
    };

    const focusLocation = (lat: number, lon: number, dist: number, presetId?: string) => {
      state.lastInteractionTime = performance.now();
      if (presetId) setActivePreset(presetId);

      // Spherical camera targeting formula
      const desiredRotX = THREE.MathUtils.clamp((lat * Math.PI) / 180, -Math.PI / 2.3, Math.PI / 2.3);
      const desiredRotY = -((lon * Math.PI) / 180) - Math.PI / 2;
      const diff = shortestAngleDiff(desiredRotY, state.currentRotY);

      state.targetRotY = state.currentRotY + diff;
      state.targetRotX = desiredRotX;
      state.targetDist = THREE.MathUtils.clamp(dist, MIN_DISTANCE, MAX_DISTANCE);
      state.targetPan.set(0, 0, 0);
    };

    const applySurfaceStyle = (style: "SATELLITE" | "TACTICAL" | "NIGHT") => {
      setSurfaceStyle(style);
      if (style === "SATELLITE") {
        sphereMat.map = dayTexture;
        sphereMat.color.setHex(0xffffff);
        cloudMesh.visible = layerVisibility.clouds;
      } else if (style === "TACTICAL") {
        sphereMat.map = dayTexture;
        sphereMat.color.setHex(0x7dd3fc); // Cyan tactical tint over authentic terrain & oceans
        cloudMesh.visible = layerVisibility.clouds;
      } else if (style === "NIGHT") {
        if (nightTexture) {
          sphereMat.map = nightTexture;
          sphereMat.color.setHex(0xffffff);
        }
        cloudMesh.visible = false;
      }
      sphereMat.needsUpdate = true;
    };

    // Attach listeners
    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    dom.addEventListener("wheel", onWheel, { passive: false });
    dom.addEventListener("dblclick", resetCamera);
    dom.addEventListener("contextmenu", (e) => e.preventDefault());

    // Expose control ref to React
    controlsRef.current = {
      reset: resetCamera,
      zoom: (delta: number) => {
        state.lastInteractionTime = performance.now();
        state.targetDist = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, state.targetDist + delta));
      },
      toggleAutoRotate: () => {
        state.autoRotate = !state.autoRotate;
        setIsRotating(state.autoRotate);
      },
      focus: focusLocation,
      setSurface: applySurfaceStyle,
    };

    // --- 12. Animation Loop & Dynamic 2D Canvas LOD Label Engine ---
    let animId: number;
    const clock = new THREE.Clock();
    let satAngle = 0;
    let lastZoomUpdate = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();
      const now = performance.now();

      // Smooth idle rotation when user is inactive
      if (state.autoRotate && !isDragging && now - state.lastInteractionTime > 2200) {
        state.targetRotY += delta * 0.038;
      }

      // Smooth damping interpolation
      state.currentRotX += (state.targetRotX - state.currentRotX) * 0.085;
      state.currentRotY += (state.targetRotY - state.currentRotY) * 0.085;
      state.currentDist += (state.targetDist - state.currentDist) * 0.09;
      state.currentPan.lerp(state.targetPan, 0.085);

      const cosX = Math.cos(state.currentRotX);
      const sinX = Math.sin(state.currentRotX);
      const cosY = Math.cos(state.currentRotY);
      const sinY = Math.sin(state.currentRotY);

      camera.position.x = state.currentPan.x + state.currentDist * cosX * sinY;
      camera.position.y = state.currentPan.y + state.currentDist * sinX;
      camera.position.z = state.currentPan.z + state.currentDist * cosX * cosY;
      camera.lookAt(state.currentPan);

      // Rotate cloud layer gently for realistic atmospheric motion
      cloudMesh.rotation.y += delta * 0.015;

      // Pulse ring animation
      pulseRings.forEach((p, idx) => {
        const s = 1 + ((elapsedTime * p.speed + idx * 0.3) % 1) * 2.2;
        p.mesh.scale.set(s, s, s);
        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 0.85 - (s - 1) * 0.4);
      });

      // Satellite orbit evolution
      satAngle += delta * 0.32;
      const sx = orbitRadiusX * Math.cos(satAngle);
      const sz = orbitRadiusZ * Math.sin(satAngle);
      satMesh.position.set(sx, sz * 0.38, sz);
      satMesh.lookAt(0, 0, 0);

      // Dynamic Layer Visibilities
      coastlineGroup.visible = layerVisibility.continents;
      indiaBorderGroup.visible = layerVisibility.states;
      internalStateGroup.visible = layerVisibility.states;
      riversGroup.visible = layerVisibility.rivers;
      incidentGroup.visible = layerVisibility.incidents;
      orbitGroup.visible = layerVisibility.orbits;
      cloudMesh.visible = layerVisibility.clouds && surfaceStyleRef.current !== "NIGHT";

      // Update Zoom HUD readout periodically
      if (now - lastZoomUpdate > 200) {
        lastZoomUpdate = now;
        const normZoom = ((MAX_DISTANCE - state.currentDist) / (MAX_DISTANCE - MIN_DISTANCE)) * 4.5 + 0.5;
        setZoomLevel(`${normZoom.toFixed(1)}X`);
      }

      // Render 3D WebGL Scene
      renderer.render(scene, camera);

      // --- Dynamic 2D Canvas LOD Label Engine ---
      if (ctx) {
        ctx.clearRect(0, 0, width, height);

        const currentDist = state.currentDist;
        const cameraNormal = camera.position.clone().normalize();

        const candidates: {
          name: string;
          code: string;
          type: string;
          severity?: string;
          pos: THREE.Vector3;
          screenX: number;
          screenY: number;
          priority: number;
        }[] = [];

        const checkAndAdd = (
          name: string,
          code: string,
          lat: number,
          lon: number,
          type: string,
          minD: number,
          maxD: number,
          priority: number,
          severity?: string
        ) => {
          if (currentDist < minD || currentDist > maxD) return;

          const worldPos = latLonToVector3(lat, lon, GLOBE_RADIUS * 1.008);
          const worldNormal = worldPos.clone().normalize();

          // Facing camera test (dot product): only show front-facing features
          const dot = worldNormal.dot(cameraNormal);
          if (dot < 0.24) return;

          // Project to Normalized Device Coordinates (-1 to +1)
          const proj = worldPos.clone().project(camera);

          // Screen coordinates
          const sx = (proj.x * 0.5 + 0.5) * width;
          const sy = (-(proj.y * 0.5) + 0.5) * height;

          if (sx < 24 || sx > width - 24 || sy < 24 || sy > height - 24) return;

          candidates.push({
            name,
            code,
            type,
            severity,
            pos: worldPos,
            screenX: sx,
            screenY: sy,
            priority,
          });
        };

        // 1. Continents (Global LOD: dist > 115)
        if (layerVisibility.continents) {
          CONTINENTS.forEach((c) => checkAndAdd(c.name, c.code, c.lat, c.lon, "CONTINENT", 115, 230, 10));
        }

        // 2. Major Countries (Country LOD: 75 < dist < 180)
        if (layerVisibility.countries) {
          COUNTRIES.forEach((c) => checkAndAdd(c.name, c.code, c.lat, c.lon, "COUNTRY", 75, 180, 20));
        }

        // 3. Indian States (India LOD: 65 < dist < 135)
        if (layerVisibility.states) {
          INDIAN_STATES.forEach((s) => checkAndAdd(s.name, s.code, s.lat, s.lon, "STATE", 65, 135, 30));
        }

        // 4. Strategic Metropolitan Cities (Regional LOD: dist < 100)
        if (layerVisibility.cities) {
          STRATEGIC_CITIES.forEach((c) => checkAndAdd(c.name, c.code, c.lat, c.lon, "CITY", 65, 100, 40));
        }

        // 5. Water Bodies (Mid LOD: 70 < dist < 210)
        WATER_BODIES.forEach((w) => checkAndAdd(w.name, w.code, w.lat, w.lon, "WATER", 70, 210, 15));

        // 6. ISIE Incidents (Always active when within range: dist < 165)
        if (layerVisibility.incidents) {
          activeIncidents.forEach((inc) =>
            checkAndAdd(
              inc.eventCode,
              inc.severity,
              inc.coordinates.lat,
              inc.coordinates.lng,
              "INCIDENT",
              65,
              165,
              50,
              inc.severity
            )
          );
        }

        candidates.sort((a, b) => b.priority - a.priority);

        // Anti-crowding: Limit max rendered labels to 16 highest priority non-overlapping items
        const renderedBoxes: { x: number; y: number; w: number; h: number }[] = [];

        candidates.forEach((item) => {
          let labelText = item.name;
          let fontSize = 9;
          let fontColor = "#94a3b8";
          let bgColor = "rgba(5, 7, 14, 0.75)";
          let borderColor = "rgba(255, 255, 255, 0.15)";

          if (item.type === "CONTINENT") {
            fontSize = 11;
            fontColor = "rgba(0, 242, 254, 0.9)";
            borderColor = "rgba(0, 242, 254, 0.4)";
            labelText = `// ${item.name}`;
          } else if (item.type === "COUNTRY") {
            fontSize = 10;
            fontColor = item.name === "INDIA" ? "#00f2fe" : "#cbd5e1";
            borderColor = item.name === "INDIA" ? "rgba(0, 242, 254, 0.7)" : "rgba(255, 255, 255, 0.15)";
          } else if (item.type === "STATE") {
            fontSize = 9;
            fontColor = "#e2e8f0";
            borderColor = "rgba(56, 189, 248, 0.35)";
          } else if (item.type === "CITY") {
            fontSize = 8.5;
            fontColor = "#38bdf8";
            borderColor = "rgba(56, 189, 248, 0.3)";
          } else if (item.type === "WATER") {
            fontSize = 9.5;
            fontColor = "rgba(56, 189, 248, 0.7)";
            borderColor = "transparent";
            bgColor = "transparent";
          } else if (item.type === "INCIDENT") {
            fontSize = 9.5;
            fontColor = item.severity === "CRITICAL" ? "#ef4444" : item.severity === "HIGH" ? "#f59e0b" : "#00f2fe";
            borderColor = fontColor;
            bgColor = "rgba(10, 15, 26, 0.92)";
            labelText = `${item.name} [${item.code}]`;
          }

          ctx.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
          const textMetrics = ctx.measureText(labelText);
          const boxW = textMetrics.width + 10;
          const boxH = fontSize + 8;
          const boxX = item.screenX - boxW / 2;
          const boxY = item.screenY - boxH / 2;

          const collides = renderedBoxes.some(
            (b) =>
              Math.abs(boxX - b.x) < (boxW + b.w) / 2 + 6 &&
              Math.abs(boxY - b.y) < (boxH + b.h) / 2 + 4
          );

          if (collides && item.type !== "INCIDENT") return;

          renderedBoxes.push({ x: boxX, y: boxY, w: boxW, h: boxH });

          if (bgColor !== "transparent") {
            ctx.fillStyle = bgColor;
            ctx.fillRect(boxX, boxY, boxW, boxH);
          }
          if (borderColor !== "transparent") {
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 1;
            ctx.strokeRect(boxX, boxY, boxW, boxH);
          }

          if (item.type === "INCIDENT" || item.type === "CITY") {
            ctx.fillStyle = fontColor;
            ctx.beginPath();
            ctx.arc(boxX + 5, boxY + boxH / 2, 2, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = fontColor;
          ctx.textBaseline = "middle";
          ctx.fillText(labelText, boxX + 6, boxY + boxH / 2);
        });
      }
    };

    animate();

    const handleResize = () => {
      if (!container || !labelCanvas) return;
      width = container.clientWidth || 800;
      height = container.clientHeight || 500;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);

      labelCanvas.width = width * dpr;
      labelCanvas.height = height * dpr;
      if (ctx) ctx.scale(dpr, dpr);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("wheel", onWheel);
      dom.removeEventListener("dblclick", resetCamera);

      sphereGeo.dispose();
      sphereMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();

      rootSystem.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });

      renderer.dispose();
    };
  }, [isRotating, layerVisibility, onSelectIncident]);

  return (
    <div className={`relative w-full h-full min-h-[380px] bg-[#05070b] overflow-hidden select-none ${className}`}>
      {/* 1. WebGL 3D Globe Canvas Container */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        title="3D Geospatial Intelligence Engine // Left-drag: Rotate • Wheel: Zoom • Right-drag: Pan • Double-click: Reset • Click beacon: Dossier"
      />

      {/* 2. 2D Dynamic Canvas for Non-Crowded Tactical LOD Labels */}
      <canvas ref={labelCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* 3. Top Geographic Focus & LOD Preset Navigation Bar */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Preset Focus Selector */}
        <div className="flex items-center gap-1 bg-isie-panel/90 border border-white/15 p-1 rounded-sm backdrop-blur-md shadow-xl pointer-events-auto overflow-x-auto scrollbar-none max-w-full">
          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 border-r border-white/10 text-[10px] font-mono text-isie-cyan font-bold">
            <Compass className="w-3 h-3 text-isie-cyan animate-pulse" />
            <span>GEO FOCUS:</span>
          </div>

          {FOCUS_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActivePreset(p.id);
                controlsRef.current?.focus(p.lat, p.lon, p.dist, p.id);
              }}
              className={`px-2 py-0.5 rounded-xs font-mono text-[10px] uppercase tracking-wider transition-colors shrink-0 ${
                activePreset === p.id
                  ? "bg-isie-primary text-black font-bold shadow-[0_0_10px_rgba(255,122,24,0.4)]"
                  : "text-isie-text-muted hover:text-white hover:bg-white/5"
              }`}
              title={p.description}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Tactical Altitude / Surface Mode & Zoom Telemetry */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Surface Mode Selector */}
          <div className="flex items-center bg-isie-panel/90 border border-white/15 rounded-sm p-0.5 backdrop-blur-md font-mono text-[10px]">
            <button
              onClick={() => controlsRef.current?.setSurface("SATELLITE")}
              className={`px-2 py-0.5 rounded-xs transition-colors ${
                surfaceStyle === "SATELLITE"
                  ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                  : "text-isie-text-muted hover:text-white"
              }`}
              title="NASA Natural Satellite Color Surface"
            >
              SATELLITE
            </button>
            <button
              onClick={() => controlsRef.current?.setSurface("TACTICAL")}
              className={`px-2 py-0.5 rounded-xs transition-colors ${
                surfaceStyle === "TACTICAL"
                  ? "bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40"
                  : "text-isie-text-muted hover:text-white"
              }`}
              title="Tactical Navy Satellite Grading"
            >
              TACTICAL
            </button>
            <button
              onClick={() => controlsRef.current?.setSurface("NIGHT")}
              className={`px-2 py-0.5 rounded-xs transition-colors ${
                surfaceStyle === "NIGHT"
                  ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40"
                  : "text-isie-text-muted hover:text-white"
              }`}
              title="Planetary Recon Night Lights"
            >
              NIGHT
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-isie-panel/90 border border-white/15 px-2.5 py-1 rounded-sm backdrop-blur-md shadow-md font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-isie-text-dim">MAG:</span>
            <span className="text-white font-bold">{zoomLevel}</span>
          </div>
        </div>
      </div>

      {/* 4. Active Incident Dossier Overlay */}
      {selectedIncident && (
        <div className="absolute top-12 left-2.5 right-2.5 sm:right-auto sm:w-84 z-20 bg-isie-panel/95 border border-isie-primary/50 rounded-sm p-3 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                {selectedIncident.eventCode} // {selectedIncident.severity}
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedIncident(null);
                if (onSelectIncident) onSelectIncident(null);
              }}
              className="text-isie-text-muted hover:text-white p-1 rounded-xs hover:bg-white/10"
              title="Close Dossier"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 font-mono text-[11px]">
            <h4 className="font-semibold text-white leading-snug">{selectedIncident.title}</h4>
            <div className="text-[10px] text-isie-text-secondary flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-isie-cyan shrink-0" />
              <span className="truncate">{selectedIncident.locationName}</span>
            </div>
            <p className="text-[10px] text-isie-text-dim leading-relaxed border-t border-white/5 pt-1.5">
              {selectedIncident.summary}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[10px]">
              <div className="bg-white/[0.03] p-1.5 rounded-xs">
                <span className="text-isie-text-muted block text-[9px]">POPULATION AT RISK</span>
                <span className="text-white font-bold">{selectedIncident.populationAtRisk.toLocaleString()}</span>
              </div>
              <div className="bg-white/[0.03] p-1.5 rounded-xs">
                <span className="text-isie-text-muted block text-[9px]">RELOCATION INDEX</span>
                <span className="text-isie-primary font-bold">{selectedIncident.relocationScore} / 100</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. GIS Layers Control Drawer */}
      {layersOpen && (
        <div className="absolute top-12 right-2.5 z-20 w-[calc(100vw-2rem)] sm:w-64 bg-isie-panel/95 border border-white/20 p-2.5 rounded-sm shadow-2xl backdrop-blur-xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-isie-text-primary">
              3D Spatial Layers
            </span>
            <button onClick={() => setLayersOpen(false)} className="text-xs text-isie-text-muted hover:text-white px-1">
              ✕
            </button>
          </div>
          <div className="space-y-1 font-mono text-[10px]">
            {[
              { key: "continents" as const, label: "Global Continents" },
              { key: "countries" as const, label: "World & Neighboring Countries" },
              { key: "states" as const, label: "Indian States & Borders" },
              { key: "rivers" as const, label: "Major River Systems" },
              { key: "cities" as const, label: "Strategic Cities & Hubs" },
              { key: "incidents" as const, label: "ISIE Incident Telemetry" },
              { key: "clouds" as const, label: "Atmospheric Cloud Layer" },
              { key: "orbits" as const, label: "Satellite Recon Orbit" },
            ].map(({ key, label }) => (
              <div
                key={key}
                onClick={() => toggleLayer(key)}
                className={`flex items-center justify-between p-1.5 rounded-xs border cursor-pointer transition-colors ${
                  layerVisibility[key]
                    ? "bg-sky-950/40 border-sky-500/30 text-sky-200"
                    : "bg-white/[0.02] border-white/5 text-isie-text-muted hover:bg-white/[0.05]"
                }`}
              >
                <span>{label}</span>
                <Eye className={`w-3 h-3 ${layerVisibility[key] ? "text-sky-400" : "text-white/20"}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Tactical Toolbar at Bottom Right */}
      <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 bg-isie-panel/90 border border-white/15 p-1 rounded-sm backdrop-blur-md shadow-2xl">
        <button
          onClick={() => setLayersOpen(!layersOpen)}
          className={`p-1.5 rounded-sm transition-colors ${
            layersOpen ? "text-isie-primary bg-orange-950/40" : "text-isie-text-secondary hover:text-white"
          }`}
          title="Toggle 3D GIS Layers"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-3.5 bg-white/15 my-auto" />

        <button
          onClick={() => controlsRef.current?.zoom(-20)}
          className="p-1.5 text-isie-text-secondary hover:text-white hover:bg-white/10 rounded-sm transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => controlsRef.current?.zoom(20)}
          className="p-1.5 text-isie-text-secondary hover:text-white hover:bg-white/10 rounded-sm transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => controlsRef.current?.toggleAutoRotate()}
          className={`p-1.5 rounded-sm transition-colors ${
            isRotating ? "text-isie-cyan bg-sky-950/40" : "text-isie-text-secondary hover:text-white"
          }`}
          title={isRotating ? "Pause Idle Orbit" : "Resume Idle Orbit"}
        >
          <Compass className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-3.5 bg-white/15 my-auto" />

        <button
          onClick={() => controlsRef.current?.reset()}
          className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 text-xs font-mono text-isie-primary rounded-xs transition-colors border border-isie-primary/30 font-semibold"
          title="Reset Camera View to India Overview"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">RESET</span>
        </button>
      </div>

      {/* 7. Bottom Left Geographic Reference Indicator */}
      <div className="absolute bottom-2.5 left-2.5 z-10 hidden sm:flex items-center gap-2 bg-isie-panel/90 border border-white/10 px-2.5 py-1 rounded-sm backdrop-blur-md font-mono text-[9px] text-isie-text-dim pointer-events-none">
        <span className="text-white font-semibold">ISIE 3D SPATIAL ENGINE</span>
        <span className="text-isie-cyan font-bold">// WGS-84</span>
        <span className="text-emerald-400">REAL EARTH TEXTURE</span>
      </div>
    </div>
  );
};

export default Global3DView;
