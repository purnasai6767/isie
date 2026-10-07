"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Command,
  ArrowRight,
  ShieldAlert,
  Globe2,
  Flame,
  MapPin,
  Activity,
  Clock,
  FileCheck2,
  Cpu,
  BellRing,
  UserCheck,
  SlidersHorizontal,
  Server,
  Database,
  Truck,
  HelpCircle,
  LogOut,
  X,
  Mic,
  Sparkles,
  Globe,
} from "lucide-react";
import { TacticalBadge } from "../ui/TacticalBadge";
import { useAuth } from "@/lib/auth/AuthContext";
import { MapsGroundingModal } from "../intel/MapsGroundingModal";
import { AudioTranscribeModal } from "../intel/AudioTranscribeModal";
import { SearchGroundingModal } from "../intel/SearchGroundingModal";

interface CommandItem {
  id: string;
  title: string;
  category: "NAVIGATION" | "VIEWPORT" | "OPERATIONS" | "SYSTEM";
  icon: React.ElementType;
  shortcut?: string;
  href?: string;
  action?: () => void;
  description: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const { logout } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mapsModalOpen, setMapsModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [transcribeModalOpen, setTranscribeModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commandItems: CommandItem[] = [
    {
      id: "cmd-search-grounding",
      title: "Live Google Search Grounding",
      category: "OPERATIONS",
      icon: Globe,
      shortcut: "S G",
      action: () => {
        onClose();
        setSearchModalOpen(true);
      },
      description: "Ask a web-grounded AI query; responses are not official advisories and require independent verification",
    },
    {
      id: "cmd-maps-grounding",
      title: "Google Maps Grounding Intelligence",
      category: "OPERATIONS",
      icon: MapPin,
      shortcut: "M P",
      action: () => {
        onClose();
        setMapsModalOpen(true);
      },
      description: "Search for place information; results are not verified route conditions or emergency-routing guidance",
    },
    {
      id: "cmd-audio-transcribe",
      title: "Tactical Voice Dispatch & Audio Transcribe",
      category: "OPERATIONS",
      icon: Mic,
      shortcut: "V D",
      action: () => {
        onClose();
        setTranscribeModalOpen(true);
      },
      description: "Microphone speech-to-text recording via gemini-3.5-transcribe and Firestore persistence",
    },
    {
      id: "cmd-dash",
      title: "Command Center Dashboard",
      category: "NAVIGATION",
      icon: ShieldAlert,
      shortcut: "G D",
      href: "/dashboard",
      description: "Jump to primary strategic tactical command view",
    },
    {
      id: "cmd-map",
      title: "Situation Map (3D Globe + 2D GIS)",
      category: "NAVIGATION",
      icon: MapPin,
      shortcut: "G M",
      href: "/geospatial",
      description: "Global 3D Earth view & 2D tactical vector GIS canvas",
    },
    {
      id: "cmd-global",
      title: "Global Situation",
      category: "NAVIGATION",
      icon: Globe2,
      shortcut: "G G",
      href: "/global",
      description: "Macro crisis telemetry & worldwide operating picture",
    },
    {
      id: "cmd-incidents",
      title: "Incidents & Crisis Triage",
      category: "OPERATIONS",
      icon: Flame,
      shortcut: "G C",
      href: "/incidents",
      description: "Active crisis triage, event escalation, and hazard perimeters",
    },
    {
      id: "cmd-alerts",
      title: "Alert Center",
      category: "OPERATIONS",
      icon: BellRing,
      shortcut: "G A",
      href: "/alerts",
      description: "Priority alerts, hazard surge warnings, and response triggers",
    },
    {
      id: "cmd-resources",
      title: "Resources & Shelter Logistics",
      category: "OPERATIONS",
      icon: Truck,
      shortcut: "G R",
      href: "/resources",
      description: "Disaster battalions, shelter capacity, and relief logistics",
    },
    {
      id: "cmd-analytics",
      title: "Analytics & Carrying Capacity",
      category: "OPERATIONS",
      icon: Activity,
      href: "/analytics",
      description: "Carrying capacity thresholds, vulnerability, and relocation index",
    },
    {
      id: "cmd-timeline",
      title: "Timeline & Event Evolution",
      category: "NAVIGATION",
      icon: Clock,
      shortcut: "G T",
      href: "/timeline",
      description: "Chronological event progression & projection scrub",
    },
    {
      id: "cmd-scenario",
      title: "Scenario / What-If Simulator",
      category: "OPERATIONS",
      icon: Cpu,
      shortcut: "G S",
      href: "/scenario",
      description: "Stress test dam release, rainfall surges & carrying capacity",
    },
    {
      id: "cmd-intel",
      title: "Evidence & Sources Verification",
      category: "NAVIGATION",
      icon: FileCheck2,
      shortcut: "G E",
      href: "/intelligence",
      description: "Authoritative feeds (IMD, CWC, ISRO NDEM, Copernicus)",
    },
    {
      id: "cmd-profile",
      title: "Officer Profile & Clearance",
      category: "SYSTEM",
      icon: UserCheck,
      href: "/profile",
      description: "Strategic command credentials and operating assignment",
    },
    {
      id: "cmd-settings",
      title: "Platform Settings",
      category: "SYSTEM",
      icon: SlidersHorizontal,
      href: "/settings",
      description: "Map defaults, visual density, and accessibility options",
    },
    {
      id: "cmd-help",
      title: "Help & Tactical Manual",
      category: "SYSTEM",
      icon: HelpCircle,
      href: "/help",
      description: "Operating guidelines, decision loop standards, and hotkeys",
    },
    {
      id: "cmd-logout",
      title: "Logout Session",
      category: "SYSTEM",
      icon: LogOut,
      action: () => logout(),
      description: "Terminate tactical session and return to Sign In",
    },
  ];

  const filteredCommands = commandItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onClose();
      }
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % (filteredCommands.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredCommands.length) % (filteredCommands.length || 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          executeCommand(selected);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  const executeCommand = (cmd: CommandItem) => {
    onClose();
    if (cmd.href) {
      router.push(cmd.href);
    } else if (cmd.action) {
      cmd.action();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-isie-panel border border-white/20 rounded-sm shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-isie-panel-light/60">
          <Search className="w-5 h-5 text-isie-primary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, incident, or navigation route..."
            className="w-full bg-transparent font-mono text-sm text-white placeholder-isie-text-dim outline-none tracking-wide"
          />
          <button
            onClick={onClose}
            className="p-1 text-isie-text-muted hover:text-white rounded-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command Items List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-isie-text-muted font-mono text-xs">
              NO MATCHING COMMANDS FOUND
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={cmd.id}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xs font-mono text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-isie-primary/15 text-white border border-isie-primary/40 shadow-sm"
                      : "text-isie-text-secondary hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-xs border ${
                        isSelected
                          ? "bg-isie-primary/20 border-isie-primary text-isie-primary"
                          : "bg-white/5 border-white/10 text-isie-text-muted"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold tracking-wider text-isie-text-primary">
                        {cmd.title}
                      </div>
                      <div className="text-[11px] text-isie-text-dim leading-tight">
                        {cmd.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <TacticalBadge variant="muted" size="sm">
                      {cmd.category}
                    </TacticalBadge>
                    {cmd.shortcut && (
                      <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded-xs text-isie-text-muted">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    <ArrowRight
                      className={`w-3.5 h-3.5 ${
                        isSelected ? "text-isie-primary" : "text-white/20"
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-isie-bg-surface border-t border-white/10 text-[10px] font-mono text-isie-text-dim">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div>ISIE COMMAND PALETTE // DEMO MODE ACTIVE</div>
        </div>
      </div>

      {/* Search Grounding Modal */}
      <SearchGroundingModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

      {/* Maps Grounding Modal */}
      <MapsGroundingModal
        isOpen={mapsModalOpen}
        onClose={() => setMapsModalOpen(false)}
      />

      {/* Audio Transcribe Modal */}
      <AudioTranscribeModal
        isOpen={transcribeModalOpen}
        onClose={() => setTranscribeModalOpen(false)}
      />
    </div>
  );
};
