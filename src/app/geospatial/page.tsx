"use client";

import { AppShell } from "@/components/layout/AppShell";
import SpatialIntelligenceDashboard from "@/components/visuals/SpatialIntelligenceDashboard";

export default function GeospatialIntelligencePage() {
  return (
    <AppShell pageTitle="Spatial Intelligence // Crisis Visualization">
      <SpatialIntelligenceDashboard />
    </AppShell>
  );
}
