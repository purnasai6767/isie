"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Play, Pause, SkipBack, SkipForward, Clock, ArrowRight } from "lucide-react";
import { TacticalBadge } from "../ui/TacticalBadge";
import { timelineService } from "@/lib/services/timelineService";
import { useAuth } from "@/lib/auth/AuthContext";
import { TimelineEvent } from "@/lib/types/isie";

interface TimelineStripProps {
  className?: string;
}

export const TimelineStrip: React.FC<TimelineStripProps> = ({ className = "" }) => {
  const { isDemoMode } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeWindow, setTimeWindow] = useState<"12H" | "24H" | "48H" | "72H">("24H");
  const [scrubberPosition, setScrubberPosition] = useState(0);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  useEffect(() => {
    timelineService.getTimelineEvents(undefined, isDemoMode).then(setTimelineEvents);
  }, [isDemoMode]);

  // Playback timer to animate timeline progression smoothly
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setScrubberPosition((prev) => {
        if (prev >= 98) return 5;
        return +(prev + 0.5).toFixed(1);
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(2, Math.min(98, Math.round((clickX / rect.width) * 100)));
    setScrubberPosition(pct);
  };

  return (
    <div
      className={`bg-isie-panel/95 border-t border-white/10 px-4 py-2.5 flex flex-col justify-between select-none shadow-2xl relative overflow-hidden ${className}`}
    >
      {/* Top Header Row with Clear Separation */}
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap sm:flex-nowrap">
        {/* Left Title & Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Clock className="w-3.5 h-3.5 text-isie-cyan shrink-0 animate-pulse" />
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-isie-text-primary truncate">
            Event Evolution & Projection Scrub
          </span>
          <TacticalBadge variant="cyan" size="sm" className="hidden md:inline-flex shrink-0">
            {timelineEvents.length} {isDemoMode ? "DEMO EVENTS" : "WORKSPACE EVENTS"}
          </TacticalBadge>
        </div>

        {/* Right Playback Controls & Window Selector (No Collision) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          {/* Play/Pause Button Group */}
          <div className="flex items-center gap-0.5 bg-isie-panel-light/60 border border-white/10 rounded-sm p-0.5 shadow-sm shrink-0">
            <button
              onClick={() => setScrubberPosition(10)}
              className="p-1 text-isie-text-muted hover:text-white transition-colors"
              title="Skip to Start (-24H)"
            >
              <SkipBack className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 text-isie-primary hover:text-isie-primary-light transition-colors"
              title={isPlaying ? "Pause Evolution" : "Play Timeline Evolution"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>
            <button
              onClick={() => setScrubberPosition(90)}
              className="p-1 text-isie-text-muted hover:text-white transition-colors"
              title="Skip to Forecast (+12H)"
            >
              <SkipForward className="w-3 h-3" />
            </button>
          </div>

          {/* Time Window Tabs */}
          <div className="flex items-center gap-1 font-mono text-[10px] shrink-0">
            {(["12H", "24H", "48H", "72H"] as const).map((w) => (
              <button
                key={w}
                onClick={() => setTimeWindow(w)}
                className={`px-1.5 py-0.5 rounded-xs transition-colors ${
                  timeWindow === w
                    ? "bg-isie-primary/20 text-isie-primary border border-isie-primary/40 font-semibold"
                    : "text-isie-text-muted hover:text-white"
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          <Link
            href="/timeline"
            className="text-[10px] font-mono text-isie-cyan hover:underline hidden lg:flex items-center gap-1 shrink-0"
          >
            <span>EXPAND</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Middle: Dedicated Scrubber Track (Never Overlapped by Text) */}
      <div
        className="relative w-full h-5 flex items-center cursor-pointer my-1"
        onClick={handleTrackClick}
        title="Click anywhere to scrub timeline"
      >
        {/* Track Line with Depth Shadow */}
        <div className="relative w-full h-2 bg-black/60 border border-white/10 rounded-full overflow-hidden shadow-inner">
          <div
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-slate-800 to-slate-700/80 transition-all duration-75"
            style={{ width: `${scrubberPosition}%` }}
          />
          <div
            className="absolute top-0 bottom-0 right-0 bg-sky-950/70 border-l border-isie-cyan shadow-[0_0_10px_rgba(56,189,248,0.4)] transition-all duration-75"
            style={{ left: `${scrubberPosition}%` }}
          />
        </div>

        {/* Event pins reflect only records returned by the selected data source. */}
        <div className="absolute inset-0 pointer-events-none">
          {timelineEvents.map((timelineEvent, index) => {
            const position =
              timelineEvents.length === 1 ? 50 : (index / (timelineEvents.length - 1)) * 100;
            return (
              <button
                key={timelineEvent.id}
                type="button"
                aria-label={`${timelineEvent.timestamp}: ${timelineEvent.title}`}
                className="absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{ left: `${position}%` }}
                onMouseEnter={() => setHoveredEvent(timelineEvent.id)}
                onMouseLeave={() => setHoveredEvent(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  setScrubberPosition(position);
                }}
              >
                <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-cyan-300 shadow" />
                {hoveredEvent === timelineEvent.id && (
                  <span className="absolute bottom-full left-1/2 z-30 mb-1.5 max-w-56 -translate-x-1/2 rounded-xs border border-white/20 bg-isie-panel px-2 py-1 text-left font-mono text-[9px] text-white shadow-xl">
                    {timelineEvent.timestamp} · {timelineEvent.title}
                  </span>
                )}
              </button>
            );
          })}
          {timelineEvents.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[8px] uppercase tracking-wider text-white/45">
              No timeline records · no events are simulated
            </div>
          )}
        </div>

        {/* Scrubber Cursor Handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 -ml-1.75 flex items-center justify-center pointer-events-none z-20"
          style={{ left: `${scrubberPosition}%` }}
        >
          <div className="w-2.5 h-4.5 rounded-xs bg-isie-primary border border-white/80 shadow-[0_0_12px_rgba(255,122,24,0.9)]" />
        </div>
      </div>

      {/* Bottom: Timeline record count; no invented forecast horizon. */}
      <div className="flex justify-between font-mono text-[9px] text-isie-text-dim px-1 pt-0.5 border-t border-white/[0.04]">
        <span>{timelineEvents.length} RECORDED EVENTS</span>
        <span>{isDemoMode ? "SYNTHETIC EXERCISE TIMELINE" : "NO LIVE TIMELINE PROVIDER"}</span>
      </div>
    </div>
  );
};
