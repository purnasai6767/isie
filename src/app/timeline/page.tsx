"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Clock, Play, Pause, SkipBack, SkipForward, ZoomIn, ZoomOut, Filter, Calendar, MapPin, AlertCircle } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { timelineService } from "@/lib/services/timelineService";
import { TimelineEvent } from "@/lib/types/isie";
import { useAuth } from "@/lib/auth/AuthContext";

export default function TimelinePage() {
  const { isDemoMode } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedPhase, setSelectedPhase] = useState("ALL");

  useEffect(() => {
    timelineService.getTimelineEvents(undefined, isDemoMode).then(setEvents);
  }, [isDemoMode]);

  const filtered = events.filter((e) =>
    selectedPhase === "ALL" ? true : e.phase === selectedPhase
  );

  return (
    <AppShell pageTitle="Timeline Analysis // Temporal Event Evolution & Projection">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Temporal Evolution & Projection Horizon
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Timeline of incident records and workspace-entered milestones. No sensor feed or forecast provider is connected.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant="cyan" size="sm">
              {events.length} TEMPORAL ANCHORS
            </TacticalBadge>
          </div>
        </div>

        {/* Phase Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-isie-panel border border-white/10 rounded-sm font-mono text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {["ALL", "EARLY_TRIGGER", "RAPID_CASCADE", "CURRENT_OBSERVATION", "PROJECTED_WINDOW"].map((ph) => (
              <button
                key={ph}
                onClick={() => setSelectedPhase(ph)}
                className={`px-3 py-1.5 rounded-xs uppercase tracking-wider transition-colors border ${
                  selectedPhase === ph
                    ? "bg-isie-primary/20 text-isie-primary border-isie-primary/50 font-semibold"
                    : "bg-white/[0.02] border-white/10 text-isie-text-muted hover:text-white"
                }`}
              >
                {ph.replace("_", " ")}
              </button>
            ))}
          </div>

          <span className="text-isie-text-dim text-[11px]">
            {isDemoMode
              ? "DEMO EXERCISE TIMELINE"
              : `${events.length} WORKSPACE RECORDS · NOT A LIVE FEED`}
          </span>
        </div>

        {/* Timeline Event Cards Flow */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon="radio"
              title="No Timeline Anchors Logged"
              description={
                isDemoMode
                  ? "No timeline milestones match the selected temporal phase."
                  : "No operational timeline milestones logged yet. When incidents are created or updated, milestones appear here automatically."
              }
              statusText="STANDBY"
            />
          ) : (
            filtered.map((item, idx) => (
            <div
              key={item.id}
              className="p-5 bg-isie-panel border border-white/10 rounded-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Accent indicator */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  item.phase === "CURRENT_OBSERVATION"
                    ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)]"
                    : item.phase === "RAPID_CASCADE"
                    ? "bg-amber-500"
                    : item.phase === "PROJECTED_WINDOW"
                    ? "bg-sky-400"
                    : "bg-slate-600"
                }`}
              />

              <div className="space-y-1.5 pl-2">
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="text-white font-bold">{item.timestamp}</span>
                  <TacticalBadge
                    variant={
                      item.severity === "CRITICAL"
                        ? "critical"
                        : item.severity === "HIGH"
                        ? "orange"
                        : "cyan"
                    }
                    size="sm"
                    pulse={item.severity === "CRITICAL"}
                  >
                    {item.severity}
                  </TacticalBadge>
                  <TacticalBadge variant="muted" size="sm">
                    {item.phase.replace("_", " ")}
                  </TacticalBadge>
                </div>

                <h3 className="font-mono text-base font-bold text-white uppercase tracking-wider">
                  {item.title}
                </h3>

                <p className="text-xs text-isie-text-secondary max-w-3xl leading-relaxed">
                  {item.summary}
                </p>
              </div>

              {item.coordinates && (
                <div className="shrink-0 p-3 bg-white/[0.02] border border-white/5 rounded-xs font-mono text-xs text-right">
                  <div className="text-[10px] text-isie-text-dim">COORDINATES</div>
                  <div className="text-isie-cyan font-bold mt-0.5">
                    {item.coordinates.lat}°N / {item.coordinates.lng}°E
                  </div>
                </div>
              )}
            </div>
          )))}
        </div>
      </div>
    </AppShell>
  );
}
