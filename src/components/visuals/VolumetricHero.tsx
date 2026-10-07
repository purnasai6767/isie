"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Compass,
  Maximize2,
  Minimize2,
  Radio,
  Layers,
  Crosshair,
  ShieldAlert,
  Activity,
  Globe2,
  ChevronRight,
  Info,
} from "lucide-react";

// --- Mathematical Helper: Convert Lat/Lon (degrees) on a sphere of radius R to Cartesian (Vector3) ---
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// --- Continental Rough Polygons for Landmass Dot Distribution ---
// Approximate bounding regions [minLat, maxLat, minLon, maxLon]
const CONTINENT_BOUNDS = [
  // India & South Asia (High priority)
  { minLat: 8, maxLat: 36, minLon: 68, maxLon: 96, isPriority: true },
  // Central & East Asia
  { minLat: 20, maxLat: 65, minLon: 45, maxLon: 145 },
  // Europe
  { minLat: 36, maxLat: 70, minLon: -10, maxLon: 45 },
  // Africa
  { minLat: -35, maxLat: 37, minLon: -18, maxLon: 52 },
  // North America
  { minLat: 15, maxLat: 72, minLon: -168, maxLon: -52 },
  // South America
  { minLat: -56, maxLat: 13, minLon: -82, maxLon: -34 },
  // Australia
  { minLat: -44, maxLat: -10, minLon: 112, maxLon: 154 },
];

function isLandmass(lat: number, lon: number): boolean {
  return CONTINENT_BOUNDS.some(
    (b) => lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon
  );
}

export const VolumetricHero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isFullscreenRef = useRef(isFullscreen);
  useEffect(() => {
    isFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);
  const [zoomLevel, setZoomLevel] = useState("1.0X");
  const [autoRotate, setAutoRotate] = useState(true);
  const [showHint, setShowHint] = useState(false);

  // Imperative hook to trigger camera operations from React buttons
  const controlsRef = useRef<{
    reset: () => void;
    zoom: (delta: number) => void;
    toggleAutoRotate: () => void;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // --- 1. Three.js Scene & Fog ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070b, 0.0014);

    // --- 2. Camera ---
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.5, 2500);

    // Default strategic camera angle: Isometric overview highlighting India & Eurasia dead-center in viewport
    const DEFAULT_CONFIG = {
      rotX: 0.22,
      rotY: -1.45, // Faces Indian longitude (~78°E) towards camera
      distance: 166, // Sized so entire planetary sphere fits inside standard viewport
      panX: 0,
      panY: -4, // Shifts center slightly upward so bottom hemisphere is fully visible above fold
      panZ: 0,
    };

    const MIN_DISTANCE = 75;
    const MAX_DISTANCE = 280;

    const state = {
      currentRotX: DEFAULT_CONFIG.rotX,
      targetRotX: DEFAULT_CONFIG.rotX,
      currentRotY: DEFAULT_CONFIG.rotY,
      targetRotY: DEFAULT_CONFIG.rotY,
      currentDist: DEFAULT_CONFIG.distance,
      targetDist: DEFAULT_CONFIG.distance,
      currentPan: new THREE.Vector3(DEFAULT_CONFIG.panX, DEFAULT_CONFIG.panY, DEFAULT_CONFIG.panZ),
      targetPan: new THREE.Vector3(DEFAULT_CONFIG.panX, DEFAULT_CONFIG.panY, DEFAULT_CONFIG.panZ),
      autoRotate: true,
      lastInteractionTime: 0,
    };

    // --- 3. WebGL Renderer ---
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x05070b, 0);
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn("WebGL is not available in current environment:", err);
      return;
    }

    // Master spatial root group
    const earthSystem = new THREE.Group();
    scene.add(earthSystem);

    const EARTH_RADIUS = 50;

    // --- 4. Central 3D Earth Sphere ---
    // Core planet: Deep navy / near-black strategic body
    const sphereGeo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x060913,
      wireframe: false,
    });
    const coreEarth = new THREE.Mesh(sphereGeo, sphereMat);
    earthSystem.add(coreEarth);

    // Atmospheric Glow Ring Shell
    const atmoGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.018, 48, 48);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.05,
    });
    const atmosphereShell = new THREE.Mesh(atmoGeo, atmoMat);
    earthSystem.add(atmosphereShell);

    // Outer Atmospheric Soft Halo Rim
    const haloGeo = new THREE.RingGeometry(EARTH_RADIUS * 1.01, EARTH_RADIUS * 1.15, 64);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.07,
    });
    const haloRim = new THREE.Mesh(haloGeo, haloMat);
    scene.add(haloRim); // Screen-facing halo

    // --- 5. Latitude & Longitude Graticule Lines ---
    const graticuleGroup = new THREE.Group();

    // Parallels (Latitude lines every 15 degrees)
    for (let lat = -75; lat <= 75; lat += 15) {
      const isEquator = lat === 0;
      const pts: THREE.Vector3[] = [];
      const segments = 90;
      for (let i = 0; i <= segments; i++) {
        const lon = (i / segments) * 360 - 180;
        pts.push(latLonToVector3(lat, lon, EARTH_RADIUS * 1.002));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineBasicMaterial({
        color: isEquator ? 0x38bdf8 : 0x1e293b,
        transparent: true,
        opacity: isEquator ? 0.65 : 0.28,
      });
      const latLine = new THREE.Line(lineGeo, lineMat);
      graticuleGroup.add(latLine);
    }

    // Meridians (Longitude lines every 15 degrees)
    for (let lon = -180; lon < 180; lon += 15) {
      const isPrime = lon === 0;
      const pts: THREE.Vector3[] = [];
      const segments = 60;
      for (let i = 0; i <= segments; i++) {
        const lat = (i / segments) * 180 - 90;
        pts.push(latLonToVector3(lat, lon, EARTH_RADIUS * 1.002));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineBasicMaterial({
        color: isPrime ? 0x38bdf8 : 0x1e293b,
        transparent: true,
        opacity: isPrime ? 0.45 : 0.22,
      });
      const lonLine = new THREE.Line(lineGeo, lineMat);
      graticuleGroup.add(lonLine);
    }
    earthSystem.add(graticuleGroup);

    // --- 6. Continental Landmass & Dot Matrix Telemetry ---
    const totalPoints = 3200;
    const dotPositions = new Float32Array(totalPoints * 3);
    const dotColors = new Float32Array(totalPoints * 3);

    const cCyan = new THREE.Color(0x38bdf8);
    const cOrange = new THREE.Color(0xff7a18);
    const cSlate = new THREE.Color(0x334155);
    const cDark = new THREE.Color(0x0f172a);

    let pIdx = 0;
    // Generate gridded surface points on sphere
    const latSteps = 45;
    const lonSteps = 70;
    for (let l = 0; l <= latSteps && pIdx < totalPoints; l++) {
      const lat = -80 + (l / latSteps) * 160;
      for (let g = 0; g < lonSteps && pIdx < totalPoints; g++) {
        const lon = -180 + (g / lonSteps) * 360;
        const v = latLonToVector3(lat, lon, EARTH_RADIUS * 1.004);

        dotPositions[pIdx * 3] = v.x;
        dotPositions[pIdx * 3 + 1] = v.y;
        dotPositions[pIdx * 3 + 2] = v.z;

        const isLand = isLandmass(lat, lon);

        let col = cDark;
        if (isLand) {
          col = Math.random() > 0.6 ? cCyan : cSlate;
        }

        dotColors[pIdx * 3] = col.r;
        dotColors[pIdx * 3 + 1] = col.g;
        dotColors[pIdx * 3 + 2] = col.b;

        pIdx++;
      }
    }

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
    dotGeo.setAttribute("color", new THREE.BufferAttribute(dotColors, 3));
    const dotMat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
    });
    const landmassPoints = new THREE.Points(dotGeo, dotMat);
    earthSystem.add(landmassPoints);

    // --- 7. XYZ 3D Coordinate Reference System ---
    const coordGroup = new THREE.Group();
    const axisLength = EARTH_RADIUS * 1.6;

    // Technical Axis Lines (X, Y, Z)
    const axesDef = [
      { dir: new THREE.Vector3(1, 0, 0), color: 0xff7a18, label: "X" }, // Equatorial X
      { dir: new THREE.Vector3(0, 1, 0), color: 0x38bdf8, label: "Z" }, // Polar Z (North)
      { dir: new THREE.Vector3(0, 0, 1), color: 0x10b981, label: "Y" }, // Meridian Y
    ];

    axesDef.forEach((ax) => {
      // Main axis line
      const linePts = [
        ax.dir.clone().multiplyScalar(-axisLength),
        ax.dir.clone().multiplyScalar(axisLength),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const lineMat = new THREE.LineDashedMaterial({
        color: ax.color,
        dashSize: 4,
        gapSize: 4,
        transparent: true,
        opacity: 0.35,
      });
      const axisLine = new THREE.Line(lineGeo, lineMat);
      axisLine.computeLineDistances();
      coordGroup.add(axisLine);

      // Positive tip indicator node
      const tipGeo = new THREE.OctahedronGeometry(1.6, 0);
      const tipMat = new THREE.MeshBasicMaterial({ color: ax.color, wireframe: true });
      const tipNode = new THREE.Mesh(tipGeo, tipMat);
      tipNode.position.copy(ax.dir.clone().multiplyScalar(axisLength));
      coordGroup.add(tipNode);
    });

    // Equatorial Reference Coordinate Disk
    const eqDiskGeo = new THREE.RingGeometry(EARTH_RADIUS * 1.35 - 0.4, EARTH_RADIUS * 1.35, 80);
    const eqDiskMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
    });
    const eqDisk = new THREE.Mesh(eqDiskGeo, eqDiskMat);
    eqDisk.rotation.x = Math.PI / 2;
    coordGroup.add(eqDisk);

    earthSystem.add(coordGroup);

    // --- 9. Satellite Orbital System ---
    const orbitGroup = new THREE.Group();

    // Orbit 1: LEO Polar / High Inclination (Sentinel-1 SAR simulation)
    const orbit1RadiusX = EARTH_RADIUS * 1.38;
    const orbit1RadiusZ = EARTH_RADIUS * 1.25;
    const orbit1Pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) {
      const th = (i / 80) * Math.PI * 2;
      orbit1Pts.push(
        new THREE.Vector3(
          Math.cos(th) * orbit1RadiusX,
          Math.sin(th) * (EARTH_RADIUS * 0.9),
          Math.sin(th) * orbit1RadiusZ * 0.7
        )
      );
    }
    const orbit1Geo = new THREE.BufferGeometry().setFromPoints(orbit1Pts);
    const orbit1Mat = new THREE.LineDashedMaterial({
      color: 0xff7a18,
      dashSize: 3,
      gapSize: 4,
      transparent: true,
      opacity: 0.4,
    });
    const orbit1Line = new THREE.Line(orbit1Geo, orbit1Mat);
    orbit1Line.computeLineDistances();
    orbitGroup.add(orbit1Line);

    // Satellite 1 Marker
    const sat1Geo = new THREE.SphereGeometry(1.6, 8, 8);
    const sat1Mat = new THREE.MeshBasicMaterial({ color: 0xff7a18 });
    const sat1Mesh = new THREE.Mesh(sat1Geo, sat1Mat);
    orbitGroup.add(sat1Mesh);

    // Satellite 1 Downlink Projection Line
    const sat1DownlinkGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const sat1DownlinkMat = new THREE.LineDashedMaterial({
      color: 0xff7a18,
      dashSize: 2,
      gapSize: 2,
      transparent: true,
      opacity: 0.35,
    });
    const sat1DownlinkLine = new THREE.Line(sat1DownlinkGeo, sat1DownlinkMat);
    orbitGroup.add(sat1DownlinkLine);

    // Orbit 2: MEO Inclined (Hydrometeorological Observation)
    const orbit2Radius = EARTH_RADIUS * 1.6;
    const orbit2Pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) {
      const th = (i / 80) * Math.PI * 2;
      orbit2Pts.push(
        new THREE.Vector3(
          Math.cos(th) * orbit2Radius,
          Math.sin(th) * 25,
          Math.sin(th) * orbit2Radius
        )
      );
    }
    const orbit2Geo = new THREE.BufferGeometry().setFromPoints(orbit2Pts);
    const orbit2Mat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 4,
      gapSize: 5,
      transparent: true,
      opacity: 0.35,
    });
    const orbit2Line = new THREE.Line(orbit2Geo, orbit2Mat);
    orbit2Line.computeLineDistances();
    orbitGroup.add(orbit2Line);

    // Satellite 2 Marker
    const sat2Geo = new THREE.SphereGeometry(1.4, 8, 8);
    const sat2Mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const sat2Mesh = new THREE.Mesh(sat2Geo, sat2Mat);
    orbitGroup.add(sat2Mesh);

    // Orbit 3: Transboundary Equatorial Orbit
    const orbit3Radius = EARTH_RADIUS * 1.82;
    const orbit3Pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) {
      const th = (i / 80) * Math.PI * 2;
      orbit3Pts.push(
        new THREE.Vector3(
          Math.cos(th) * orbit3Radius,
          Math.sin(th) * 8,
          Math.sin(th) * orbit3Radius
        )
      );
    }
    const orbit3Geo = new THREE.BufferGeometry().setFromPoints(orbit3Pts);
    const orbit3Mat = new THREE.LineDashedMaterial({
      color: 0x64748b,
      dashSize: 5,
      gapSize: 6,
      transparent: true,
      opacity: 0.25,
    });
    const orbit3Line = new THREE.Line(orbit3Geo, orbit3Mat);
    orbit3Line.computeLineDistances();
    orbitGroup.add(orbit3Line);

    earthSystem.add(orbitGroup);

    // --- 10. Distant Tactical Sensor Stars / Deep Coordinate Dust ---
    const starCount = 1100;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const r = 240 + Math.random() * 320;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 2 - 1);
      starPositions[i3] = r * Math.sin(ph) * Math.cos(th);
      starPositions[i3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.75;
      starPositions[i3 + 2] = r * Math.cos(ph);

      const col = Math.random() > 0.4 ? cSlate : cDark;
      starColors[i3] = col.r;
      starColors[i3 + 1] = col.g;
      starColors[i3 + 2] = col.b;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // --- 13. Interactive Pointer & Camera Controls ---
    let isDragging = false;
    let dragMode: "ROTATE" | "PAN" = "ROTATE";
    let lastPointerX = 0;
    let lastPointerY = 0;
    let initialPinchDistance = 0;
    let initialTouchMidX = 0;
    let initialTouchMidY = 0;

    const notifyInteraction = () => {
      state.lastInteractionTime = performance.now();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 2 || e.shiftKey || e.button === 1) {
        dragMode = "PAN";
      } else {
        dragMode = "ROTATE";
      }
      isDragging = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      notifyInteraction();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - lastPointerX;
      const deltaY = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;

      notifyInteraction();

      if (dragMode === "ROTATE") {
        state.targetRotY += deltaX * 0.0055;
        state.targetRotX = Math.max(
          -Math.PI / 2.3,
          Math.min(Math.PI / 2.3, state.targetRotX + deltaY * 0.0055)
        );
      } else {
        const cosY = Math.cos(state.currentRotY);
        const sinY = Math.sin(state.currentRotY);
        const panFactor = state.currentDist * 0.0015;

        state.targetPan.x -= (deltaX * cosY - deltaY * sinY * 0.3) * panFactor;
        state.targetPan.z += (deltaX * sinY + deltaY * cosY * 0.3) * panFactor;
        state.targetPan.y += deltaY * panFactor * 0.8;

        state.targetPan.x = Math.max(-80, Math.min(80, state.targetPan.x));
        state.targetPan.y = Math.max(-50, Math.min(60, state.targetPan.y));
        state.targetPan.z = Math.max(-80, Math.min(80, state.targetPan.z));
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      // In embedded landing page mode, NEVER intercept wheel events: allow 100% native vertical page scroll
      if (!isFullscreenRef.current) {
        return;
      }
      // In fullscreen spatial exploration mode, wheel zooms the 3D earth
      e.preventDefault();
      notifyInteraction();
      const zoomDelta = e.deltaY * 0.16;
      state.targetDist = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, state.targetDist + zoomDelta));
    };

    const onDoubleClick = (e: MouseEvent) => {
      e.preventDefault();
      resetCameraView();
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Touch Support
    const onTouchStart = (e: TouchEvent) => {
      // In embedded landing mode, allow single touch swipe to scroll the page naturally
      if (!isFullscreenRef.current && e.touches.length === 1) {
        return;
      }
      notifyInteraction();
      if (e.touches.length === 1) {
        dragMode = "ROTATE";
        isDragging = true;
        lastPointerX = e.touches[0].clientX;
        lastPointerY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        dragMode = "PAN";
        isDragging = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDistance = Math.hypot(dx, dy);
        initialTouchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        initialTouchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      // In embedded landing mode, allow single touch swipe to scroll the page naturally
      if (!isFullscreenRef.current && e.touches.length === 1) {
        return;
      }
      notifyInteraction();
      if (!isDragging) return;

      if (e.touches.length === 1 && dragMode === "ROTATE") {
        const deltaX = e.touches[0].clientX - lastPointerX;
        const deltaY = e.touches[0].clientY - lastPointerY;
        lastPointerX = e.touches[0].clientX;
        lastPointerY = e.touches[0].clientY;

        state.targetRotY += deltaX * 0.006;
        state.targetRotX = Math.max(
          -Math.PI / 2.3,
          Math.min(Math.PI / 2.3, state.targetRotX + deltaY * 0.006)
        );
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentPinch = Math.hypot(dx, dy);

        if (initialPinchDistance > 0) {
          const pinchDelta = initialPinchDistance - currentPinch;
          state.targetDist = Math.max(
            MIN_DISTANCE,
            Math.min(MAX_DISTANCE, state.targetDist + pinchDelta * 0.6)
          );
          initialPinchDistance = currentPinch;
        }

        const currentMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const currentMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const panDeltaX = currentMidX - initialTouchMidX;
        const panDeltaY = currentMidY - initialTouchMidY;
        initialTouchMidX = currentMidX;
        initialTouchMidY = currentMidY;

        const panFactor = state.currentDist * 0.0015;
        state.targetPan.x -= panDeltaX * panFactor;
        state.targetPan.y += panDeltaY * panFactor;
      }
    };

    const onTouchEnd = () => {
      isDragging = false;
      initialPinchDistance = 0;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) return;

      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        resetCameraView();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        notifyInteraction();
        state.targetDist = Math.max(MIN_DISTANCE, state.targetDist - 25);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        notifyInteraction();
        state.targetDist = Math.min(MAX_DISTANCE, state.targetDist + 25);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        notifyInteraction();
        state.targetRotY -= 0.12;
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        notifyInteraction();
        state.targetRotY += 0.12;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        notifyInteraction();
        state.targetRotX = Math.min(Math.PI / 2.3, state.targetRotX + 0.08);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        notifyInteraction();
        state.targetRotX = Math.max(-Math.PI / 2.3, state.targetRotX - 0.08);
      } else if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };

    const resetCameraView = () => {
      notifyInteraction();
      state.targetRotX = DEFAULT_CONFIG.rotX;
      state.targetRotY = DEFAULT_CONFIG.rotY;
      state.targetDist = DEFAULT_CONFIG.distance;
      state.targetPan.set(DEFAULT_CONFIG.panX, DEFAULT_CONFIG.panY, DEFAULT_CONFIG.panZ);
    };

    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("wheel", onWheel, { passive: false });
    dom.addEventListener("dblclick", onDoubleClick);
    dom.addEventListener("contextmenu", onContextMenu);
    dom.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    controlsRef.current = {
      reset: resetCameraView,
      zoom: (delta: number) => {
        notifyInteraction();
        state.targetDist = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, state.targetDist + delta));
      },
      toggleAutoRotate: () => {
        state.autoRotate = !state.autoRotate;
        setAutoRotate(state.autoRotate);
      },
    };

    // --- 14. Animation Loop ---
    let animId: number;
    const clock = new THREE.Clock();
    let sat1Angle = 0;
    let sat2Angle = 1.8;
    let lastZoomUpdate = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();
      const now = performance.now();

      // Slow majestic idle rotation of Earth
      if (state.autoRotate && !isDragging && now - state.lastInteractionTime > 2000) {
        state.targetRotY += delta * 0.038;
      }

      // Smooth camera interpolation (damping)
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

      // Keep halo rim facing camera
      haloRim.lookAt(camera.position);

      // Periodically update Zoom indicator readout
      if (now - lastZoomUpdate > 200) {
        setZoomLevel((DEFAULT_CONFIG.distance / state.currentDist).toFixed(1) + "X");
        lastZoomUpdate = now;
      }

      // Satellite 1 Keplerian Orbit & Nadir Projection
      sat1Angle = (sat1Angle + delta * 0.28) % (Math.PI * 2);
      const s1X = Math.cos(sat1Angle) * orbit1RadiusX;
      const s1Y = Math.sin(sat1Angle) * (EARTH_RADIUS * 0.9);
      const s1Z = Math.sin(sat1Angle) * orbit1RadiusZ * 0.7;
      sat1Mesh.position.set(s1X, s1Y, s1Z);

      // Ground projection
      const s1Ground = sat1Mesh.position.clone().normalize().multiplyScalar(EARTH_RADIUS * 1.008);
      const posAttr1 = sat1DownlinkLine.geometry.attributes.position as THREE.BufferAttribute;
      posAttr1.setXYZ(0, s1X, s1Y, s1Z);
      posAttr1.setXYZ(1, s1Ground.x, s1Ground.y, s1Ground.z);
      posAttr1.needsUpdate = true;
      sat1DownlinkLine.computeLineDistances();

      // Satellite 2 Orbit
      sat2Angle = (sat2Angle + delta * 0.18) % (Math.PI * 2);
      sat2Mesh.position.set(
        Math.cos(sat2Angle) * orbit2Radius,
        Math.sin(sat2Angle) * 25,
        Math.sin(sat2Angle) * orbit2Radius
      );

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      if (width <= 0 || height <= 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // --- 15. Resource Cleanup ---
    return () => {
      window.removeEventListener("resize", handleResize);
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      dom.removeEventListener("wheel", onWheel);
      dom.removeEventListener("dblclick", onDoubleClick);
      dom.removeEventListener("contextmenu", onContextMenu);
      dom.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);

      cancelAnimationFrame(animId);

      if (container.contains(dom)) {
        container.removeChild(dom);
      }

      // Memory cleanup
      sphereGeo.dispose();
      sphereMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      dotGeo.dispose();
      dotMat.dispose();
      starGeo.dispose();
      starMat.dispose();

      earthSystem.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Points) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("dblclick", onDoubleClick);
      dom.removeEventListener("contextmenu", onContextMenu);
      dom.removeEventListener("touchstart", onTouchStart);

      renderer.dispose();
    };
  }, []);

  return (
    <>
      {/* Background Interactive WebGL Canvas */}
      <div
        className={`select-none ${
          isFullscreen
            ? "fixed inset-0 z-40 bg-isie-bg-deep w-screen h-screen"
            : "fixed inset-0 w-screen h-screen pointer-events-none overflow-hidden"
        }`}
      >
        {/* Three.js DOM Container */}
        <div
          ref={containerRef}
          className="absolute inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing"
          title="3D Spatial Intelligence Environment // Drag to rotate • Wheel to zoom • Shift/Right-drag to pan • Double-click to reset"
        />

        {/* --- FULLSCREEN SPATIAL EXPLORATION MODE HUD (Z-INDEX 40) --- */}
        {isFullscreen && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 z-50">
            {/* Top Tactical Fullscreen Bar */}
            <div className="flex items-center justify-between pointer-events-auto gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-isie-primary to-orange-700 flex items-center justify-center font-mono font-bold text-black text-xs shadow-[0_0_15px_rgba(255,122,24,0.4)]">
                  IS
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs sm:text-sm font-bold tracking-widest text-white uppercase">
                      SPATIAL INTELLIGENCE ENVIRONMENT
                    </span>
                    <span className="px-1.5 py-0.5 bg-isie-cyan/20 border border-isie-cyan/40 text-isie-cyan text-[9px] font-mono rounded-xs">
                      FULLSCREEN EXPLORER
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-isie-text-dim">
                    GLOBAL GEOSPATIAL TWIN // HIGH-DIMENSIONAL SPATIAL MODEL
                  </div>
                </div>
              </div>

              {/* Exit Spatial View CTA */}
              <button
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-red-950/40 border border-white/20 hover:border-red-500/50 text-white hover:text-red-300 font-mono text-xs uppercase tracking-wider rounded-xs backdrop-blur-md transition-colors"
                title="Exit Spatial View (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>EXIT SPATIAL VIEW</span>
              </button>
            </div>

            {/* Tactical Crosshairs & Center Graticule (HUD) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 rounded-full border border-white/5 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border border-dashed border-isie-cyan/15" />
              </div>
              <div className="absolute w-8 h-[1px] bg-isie-cyan/40" />
              <div className="absolute h-8 w-[1px] bg-isie-cyan/40" />
            </div>

            {/* Bottom Fullscreen Telemetry Console */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-4 pointer-events-auto">
              {/* Strategic Coordinate & Sensor Dossier */}
              <div className="bg-isie-panel/90 border border-white/15 p-3 rounded-sm backdrop-blur-md max-w-sm font-mono text-xs space-y-1.5 shadow-2xl">
                <div className="flex items-center justify-between text-[10px] text-isie-text-dim border-b border-white/10 pb-1">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Radio className="w-3 h-3 animate-pulse" />
                    GLOBE VISUALIZATION
                  </span>
                  <span className="text-isie-cyan">STATIC ORBITAL DISPLAY</span>
                </div>
                <div className="text-white font-bold text-xs uppercase tracking-wider">
                  GLOBAL SPATIAL INTELLIGENCE ENVIRONMENT
                </div>
                <div className="text-[11px] text-isie-text-secondary leading-snug">
                  This visualization does not ingest satellite, weather, river-gauge, or hazard data.
                </div>
                <div className="flex items-center justify-between pt-1 text-[9px] text-isie-text-dim border-t border-white/5">
                  <span>LIVE SENSOR FEEDS: NOT CONNECTED</span>
                  <span className="text-amber-400 font-semibold">VISUALIZATION ONLY</span>
                </div>
              </div>

              {/* Bottom Right Fullscreen Nav Controls */}
              <div className="flex items-center gap-1.5 bg-isie-bg-deep/90 border border-white/15 px-3 py-2 rounded-sm backdrop-blur-md shadow-2xl font-mono text-xs">
                <button
                  onClick={() => controlsRef.current?.zoom(-30)}
                  className="p-1 text-isie-text-secondary hover:text-white hover:bg-white/10 rounded-xs transition-colors"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => controlsRef.current?.zoom(30)}
                  className="p-1 text-isie-text-secondary hover:text-white hover:bg-white/10 rounded-xs transition-colors"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => controlsRef.current?.toggleAutoRotate()}
                  className={`p-1 rounded-xs transition-colors ${
                    autoRotate ? "text-isie-cyan bg-sky-950/50" : "text-isie-text-dim hover:text-white"
                  }`}
                  title={autoRotate ? "Pause Rotation" : "Auto-Rotate"}
                >
                  <Compass className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-white/20 mx-1" />
                <button
                  onClick={() => controlsRef.current?.reset()}
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] tracking-wider uppercase text-isie-primary hover:text-white bg-isie-primary/10 hover:bg-isie-primary/30 border border-isie-primary/40 rounded-xs transition-colors font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>RESET VIEW</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- NORMAL EMBEDDED MODE SPATIAL HUD (Z-INDEX 25) --- */}
        {!isFullscreen && (
          <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 pointer-events-auto flex items-center gap-1.5 bg-isie-bg-deep/90 border border-white/15 px-2.5 py-1.5 rounded-sm backdrop-blur-md shadow-2xl text-xs font-mono">
            {/* Dynamic Coordinates Readout */}
            <div className="hidden lg:flex items-center gap-2 pr-2.5 border-r border-white/15 text-[10px] text-isie-text-dim">
              <span className="w-1.5 h-1.5 rounded-full bg-isie-cyan animate-pulse" />
              <span className="text-white tracking-wider font-semibold">EARTH SPATIAL</span>
              <span className="text-isie-cyan font-bold">LAT 20.6°N</span>
              <span className="text-isie-primary font-bold">LON 79.0°E</span>
              <span className="text-white/60">ALT 421KM</span>
            </div>

            {/* Zoom In */}
            <button
              onClick={() => controlsRef.current?.zoom(-30)}
              className="p-1 text-isie-text-muted hover:text-white hover:bg-white/10 rounded-xs transition-colors"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* Zoom Out */}
            <button
              onClick={() => controlsRef.current?.zoom(30)}
              className="p-1 text-isie-text-muted hover:text-white hover:bg-white/10 rounded-xs transition-colors"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Auto-Rotation Toggle */}
            <button
              onClick={() => controlsRef.current?.toggleAutoRotate()}
              className={`p-1 rounded-xs transition-colors ${
                autoRotate
                  ? "text-isie-cyan bg-sky-950/40 hover:bg-sky-900/50"
                  : "text-isie-text-dim hover:text-white hover:bg-white/10"
              }`}
              title={autoRotate ? "Pause Orbit Rotation" : "Resume Orbit Rotation"}
              aria-label="Toggle Orbit Rotation"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>

            {/* The Fullscreen / Expand Control */}
            <button
              onClick={() => setIsFullscreen(true)}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] tracking-wider uppercase text-isie-cyan hover:text-white bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/40 rounded-xs transition-colors font-semibold"
              title="Open Fullscreen Spatial Exploration Mode"
            >
              <Maximize2 className="w-3 h-3" />
              <span>EXPAND</span>
            </button>

            <div className="w-[1px] h-3.5 bg-white/15 my-auto" />

            {/* The explicitly required RESET VIEW control */}
            <button
              onClick={() => controlsRef.current?.reset()}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] tracking-wider uppercase text-isie-primary hover:text-white bg-isie-primary/10 hover:bg-isie-primary/30 border border-isie-primary/40 rounded-xs transition-colors font-semibold"
              title="Reset Camera View to Default (Key: R or Double Click)"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET VIEW</span>
            </button>

            {/* Quick Guide Trigger */}
            <button
              onClick={() => setShowHint(!showHint)}
              className="text-[10px] text-white/40 hover:text-white px-1 ml-0.5"
              title="Navigation Controls Guide"
            >
              ?
            </button>
          </div>
        )}

        {/* Quick Guide Popover */}
        {!isFullscreen && showHint && (
          <div className="fixed bottom-12 right-3 sm:bottom-14 sm:right-4 z-20 pointer-events-auto bg-isie-panel/95 border border-white/15 p-3 rounded-sm backdrop-blur-md shadow-2xl font-mono text-[10px] text-isie-text-secondary space-y-1.5 max-w-xs animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between text-white font-bold pb-1 border-b border-white/10">
              <span>3D EARTH SPATIAL CONTROLS</span>
              <span className="text-isie-cyan">ISIE CORE</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-0.5">
              <div><span className="text-white font-semibold">Left Drag:</span> Rotate Earth</div>
              <div><span className="text-white font-semibold">Scroll / Pinch:</span> Zoom</div>
              <div><span className="text-white font-semibold">Right / Shift Drag:</span> Pan</div>
              <div><span className="text-white font-semibold">Double Click:</span> Reset</div>
              <div><span className="text-white font-semibold">Key R:</span> Reset View</div>
              <div><span className="text-white font-semibold">Keys +/-:</span> Zoom In/Out</div>
              <div><span className="text-white font-semibold">Arrow Keys:</span> Orbit Tilt</div>
              <div><span className="text-white font-semibold">EXPAND:</span> Fullscreen</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
