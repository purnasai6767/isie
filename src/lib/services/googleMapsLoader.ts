"use client";

import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

// Primary attribution identifier required by Google Maps Platform guidelines
export const GMP_ATTRIBUTION_ID = "gmp_mcp_codeassist_v1_aistudio";

// Register global auth failure listener to catch RefererNotAllowedMapError and quota notices
if (typeof window !== "undefined") {
  const prevAuth = (window as any).gm_authFailure;
  (window as any).gm_authFailure = () => {
    window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
    window.dispatchEvent(
      new CustomEvent("gmp-auth-failure", {
        detail: { reason: "gm_authFailure" },
      })
    );
    if (typeof prevAuth === "function") prevAuth();
  };

  const origError = console.error;
  console.error = (...args: unknown[]) => {
    origError.apply(console, args);
    const msg = args.map((a) => String(a)).join(" ");
    if (msg.includes("OverQuotaMapError") || msg.includes("QuotaExceededError")) {
      window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
    }
  };
}

let optionsConfigured = false;
let loadPromise: Promise<typeof google> | null = null;

export function getGoogleMapsApiKey(): string {
  const envKey = (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    (typeof window !== "undefined" && (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) ||
    ""
  ).trim();
  return envKey;
}

export function isGoogleMapsConfigured(): boolean {
  const key = getGoogleMapsApiKey();
  return !!key && key.trim().length > 10;
}

export async function loadGoogleMaps(): Promise<typeof google> {
  const apiKey = getGoogleMapsApiKey();

  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not defined. Please set this environment variable."
    );
  }

  if (typeof window !== "undefined" && (window as any).google?.maps?.Map) {
    return (window as any).google;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        if (!optionsConfigured && typeof window !== "undefined") {
          setOptions({
            key: apiKey,
            v: "weekly",
          });
          optionsConfigured = true;
        }

        // Import required libraries using the new functional API
        await Promise.all([
          importLibrary("maps"),
          importLibrary("marker"),
          importLibrary("geometry"),
        ]);

        // Attempt importing maps3d library if needed
        try {
          await importLibrary("maps3d");
        } catch {
          // maps3d can be loaded on-demand
        }

        if (typeof window !== "undefined" && (window as any).google?.maps) {
          return (window as any).google;
        }

        throw new Error("Google Maps JavaScript API loaded without global google.maps namespace.");
      } catch (err) {
        // Reset cached promise on failure so callers can retry
        loadPromise = null;
        throw err;
      }
    })();
  }

  return loadPromise;
}
