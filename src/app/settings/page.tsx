"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SlidersHorizontal, Globe, Eye, Save } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { TacticalButton } from "@/components/ui/TacticalButton";

const PREFERENCES_KEY = "isie_display_preferences";

interface DisplayPreferences {
  mapDefault: string;
  reducedMotion: boolean;
  highContrast: boolean;
}

function isDisplayPreferences(value: unknown): value is DisplayPreferences {
  if (typeof value !== "object" || value === null) return false;
  return (
    "mapDefault" in value &&
    (value.mapDefault === "3D_GLOBE" || value.mapDefault === "2D_MAP" || value.mapDefault === "SPLIT_VIEW") &&
    "reducedMotion" in value &&
    typeof value.reducedMotion === "boolean" &&
    "highContrast" in value &&
    typeof value.highContrast === "boolean"
  );
}

export default function SettingsPage() {
  const [mapDefault, setMapDefault] = useState("3D_GLOBE");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      if (!isDisplayPreferences(parsed)) {
        localStorage.removeItem(PREFERENCES_KEY);
        return;
      }
      setMapDefault(parsed.mapDefault);
      setReducedMotion(parsed.reducedMotion);
      setHighContrast(parsed.highContrast);
      document.documentElement.dataset.isieReducedMotion = String(parsed.reducedMotion);
      document.documentElement.dataset.isieHighContrast = String(parsed.highContrast);
    } catch (error) {
      console.error("Could not restore local display preferences.", error);
      setSaveError("Could not read saved display preferences from this browser.");
    }
  }, []);

  const handleSave = () => {
    const preferences: DisplayPreferences = { mapDefault, reducedMotion, highContrast };
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
      document.documentElement.dataset.isieReducedMotion = String(reducedMotion);
      document.documentElement.dataset.isieHighContrast = String(highContrast);
      setSaveError("");
      setSavedFeedback(true);
      window.setTimeout(() => setSavedFeedback(false), 2500);
    } catch (error) {
      console.error("Could not save local display preferences.", error);
      setSavedFeedback(false);
      setSaveError("Could not save preferences to this browser. Check local storage availability.");
    }
  };

  return (
    <AppShell pageTitle="Settings // Tactical Platform Configuration">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SlidersHorizontal className="w-5 h-5 text-isie-primary" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Platform Preferences & Display Architecture
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Preferences are saved to this browser only. Map selection is a saved preference; it does not connect data providers or change access permissions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant="cyan" size="sm">
              LOCAL PREVIEW STATE
            </TacticalBadge>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Spatial & Map Defaults */}
          <div className="p-5 bg-isie-panel border border-white/10 rounded-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 font-mono text-xs">
              <div className="flex items-center gap-2 text-white font-semibold uppercase tracking-wider">
                <Globe className="w-4 h-4 text-isie-cyan" />
                <span>Spatial Viewport Defaults</span>
              </div>
              <TacticalBadge variant="muted" size="sm">
                GRAPHICS
              </TacticalBadge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="space-y-2">
                <label className="text-isie-text-secondary uppercase text-[11px]">
                  Preferred Map View (browser preference)
                </label>
                <select
                  value={mapDefault}
                  onChange={(e) => setMapDefault(e.target.value)}
                  className="w-full bg-isie-panel-light border border-white/10 p-2 text-white outline-none rounded-xs"
                >
                  <option value="3D_GLOBE">3D Rotating Globe (Three.js)</option>
                  <option value="2D_MAP">2D Tactical Vector Canvas</option>
                  <option value="SPLIT_VIEW">Split Screen Synchronized View</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-isie-text-secondary uppercase text-[11px]">
                  Display Density
                </label>
                <select disabled className="w-full bg-isie-panel-light border border-white/10 p-2 text-isie-text-dim outline-none rounded-xs">
                  <option>Not configurable in this prototype</option>
                </select>
              </div>
            </div>
          </div>

          {/* Accessibility & Visual Comfort */}
          <div className="p-5 bg-isie-panel border border-white/10 rounded-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 font-mono text-xs">
              <div className="flex items-center gap-2 text-white font-semibold uppercase tracking-wider">
                <Eye className="w-4 h-4 text-isie-primary" />
                <span>Accessibility & Ergonomics</span>
              </div>
              <TacticalBadge variant="muted" size="sm">
                A11Y
              </TacticalBadge>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xs">
                <div>
                  <div className="text-white font-semibold">Reduced Motion Mode</div>
                  <div className="text-[11px] text-isie-text-dim">
                    Reduces CSS animation and transition motion across the interface
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  className="w-4 h-4 accent-isie-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xs">
                <div>
                  <div className="text-white font-semibold">High Contrast Borders</div>
                  <div className="text-[11px] text-isie-text-dim">
                    Increases contrast for muted interface text
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  className="w-4 h-4 accent-isie-primary cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Save Action */}
          <div className="flex items-center justify-between pt-2">
            <span className="font-mono text-xs text-emerald-400">
              {savedFeedback && "PREFERENCES SAVED TO THIS BROWSER"}
            </span>
            <TacticalButton
              variant="primary"
              size="md"
              onClick={handleSave}
              icon={<Save className="w-4 h-4" />}
            >
              SAVE CONFIGURATION
            </TacticalButton>
          </div>
          {saveError && <p role="alert" className="text-right font-mono text-xs text-red-300">{saveError}</p>}
        </div>
      </div>
    </AppShell>
  );
}
