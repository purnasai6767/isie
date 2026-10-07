"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Flame, MapPin, ArrowRight, ShieldAlert, AlertTriangle } from "lucide-react";
import { TacticalBadge } from "../ui/TacticalBadge";
import { EmptyState } from "../ui/EmptyState";
import { intelligenceService } from "@/lib/services/intelligenceService";
import { IntelligenceEvent } from "@/lib/types/isie";
import { useAuth } from "@/lib/auth/AuthContext";

interface LeftIntelPanelProps {
  className?: string;
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: IntelligenceEvent) => void;
  incidents?: IntelligenceEvent[];
}

export const LeftIntelPanel: React.FC<LeftIntelPanelProps> = ({
  className = "",
  selectedIncidentId,
  onSelectIncident,
  incidents: propIncidents,
}) => {
  const { isDemoMode } = useAuth();
  const [events, setEvents] = useState<IntelligenceEvent[]>(propIncidents || []);
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Sync with prop if provided
  useEffect(() => {
    if (selectedIncidentId) {
      setSelectedEventId(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  useEffect(() => {
    if (propIncidents) {
      setEvents(propIncidents);
      if (propIncidents.length > 0 && !selectedIncidentId) {
        setSelectedEventId(propIncidents[0].id);
      }
      return;
    }

    intelligenceService.getActiveEvents(undefined, isDemoMode).then((data) => {
      setEvents(data);
      if (data.length > 0 && !selectedIncidentId) {
        setSelectedEventId(data[0].id);
      }
    });
  }, [selectedIncidentId, propIncidents, isDemoMode]);

  const filtered = events.filter((e) =>
    filterSeverity === "ALL" ? true : e.severity === filterSeverity
  );

  return (
    <div
      className={`flex flex-col h-full min-h-0 min-w-0 bg-isie-panel select-none ${className}`}
    >
      {/* Panel Header with Breathing Room */}
      <div className="px-5 py-4 border-b border-white/10 bg-isie-panel-light/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Flame className="w-4 h-4 text-isie-primary shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-isie-text-primary truncate">
              Critical Events
            </span>
            <span className="text-[10px] font-mono text-isie-text-dim truncate">
              INCIDENT REPORTS
            </span>
          </div>
        </div>
        <TacticalBadge variant="orange" size="sm" className="shrink-0">
          {events.length} {isDemoMode ? "SAMPLE" : "WORKSPACE"}
        </TacticalBadge>
      </div>

      {/* Severity Filter Tabs */}
      <div className="px-4 py-2.5 border-b border-white/10 bg-isie-bg-surface/40 flex items-center justify-between text-[11px] font-mono shrink-0 gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          {["ALL", "CRITICAL", "HIGH", "MEDIUM"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterSeverity(lvl)}
              className={`px-2.5 py-1 rounded-xs transition-colors shrink-0 ${
                filterSeverity === lvl
                  ? "bg-white/15 text-white font-semibold shadow-sm"
                  : "text-isie-text-muted hover:text-white hover:bg-white/5"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
        <Link
          href="/incidents"
          className="text-isie-text-muted hover:text-isie-cyan shrink-0 p-1 rounded-xs hover:bg-white/5 transition-colors"
          title="Open Full Incident Console"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Content Area: Incident Cards with Generous Spacing */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin">
        {filtered.length === 0 ? (
          <EmptyState
            compact
            icon="shield"
            title="No Active Crises Logged"
            description={
              isDemoMode
                ? "No incidents match the selected severity filter."
                : "No incident reports are currently available in this workspace."
            }
            statusText="SYSTEM IDLE"
          />
        ) : (
          filtered.map((item) => {
          const isSelected = selectedEventId === item.id;
          const isCritical = item.severity === "CRITICAL";
          const isHigh = item.severity === "HIGH";

          return (
            <div
              key={item.id}
              onClick={() => {
                setSelectedEventId(item.id);
                onSelectIncident?.(item);
              }}
              className={`p-4 sm:p-5 rounded-sm border cursor-pointer transition-all duration-200 relative group overflow-hidden ${
                isSelected
                  ? "bg-gradient-to-r from-isie-primary/10 via-isie-panel-elevated to-isie-panel border-l-4 border-l-isie-primary border-white/20 shadow-lg"
                  : isCritical
                  ? "bg-white/[0.025] hover:bg-white/[0.045] border-l-4 border-l-red-500/80 border-white/10 hover:border-white/20 shadow-sm"
                  : isHigh
                  ? "bg-white/[0.025] hover:bg-white/[0.045] border-l-4 border-l-amber-500/80 border-white/10 hover:border-white/20 shadow-sm"
                  : "bg-white/[0.025] hover:bg-white/[0.045] border-l-4 border-l-isie-cyan/70 border-white/10 hover:border-white/20 shadow-sm"
              }`}
            >
              {/* Top Row: Event Code, Badge, Timestamp */}
              <div className="flex items-center justify-between mb-2 font-mono text-[11px] gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-white font-bold tracking-wider">{item.eventCode}</span>
                  <TacticalBadge
                    variant={
                      isCritical
                        ? "critical"
                        : isHigh
                        ? "warning"
                        : "cyan"
                    }
                    size="sm"
                    pulse={isCritical}
                    className="shrink-0"
                  >
                    {item.severity}
                  </TacticalBadge>
                </div>
                <span className="text-isie-text-dim text-[10px] shrink-0 font-normal">
                  {item.timestamp.split(" ")[1] || item.timestamp}
                </span>
              </div>

              {/* Title Area with Proper Line Height & Word Break */}
              <h4 className="font-mono text-xs font-semibold text-white leading-relaxed mb-2 break-words">
                {item.title}
              </h4>

              {/* Location Line */}
              <div className="flex items-center gap-1.5 text-xs text-isie-text-secondary mb-3 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-isie-cyan shrink-0" />
                <span className="truncate">{item.locationName}</span>
              </div>

              {/* Summary Description with Controlled Line Clamp */}
              {item.summary && (
                <p className="text-[11px] text-isie-text-dim leading-relaxed mb-3 line-clamp-2">
                  {item.summary}
                </p>
              )}

              {/* Metric Footer Row */}
              <div className="flex justify-between items-center pt-2.5 border-t border-white/[0.08] font-mono text-[11px] gap-2">
                <div className="text-isie-text-muted truncate">
                  AT RISK: <strong className="text-white font-semibold">{item.populationAtRisk.toLocaleString()}</strong>
                </div>
                <div className="text-isie-primary font-bold shrink-0">
                  INDEX: {item.relocationScore}
                </div>
              </div>
            </div>
          );
        }))}
      </div>

      {/* Panel Footer */}
      <div className="px-4 py-2.5 border-t border-white/10 bg-isie-panel-light/20 flex items-center justify-between text-[11px] font-mono text-isie-text-dim shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{isDemoMode ? "DEMO EXERCISE STREAM" : "NO LIVE PROVIDER FEED"}</span>
        </span>
        <Link href="/incidents" className="text-isie-primary hover:underline font-semibold flex items-center gap-1">
          <span>ALL INCIDENTS</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};
