"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Command,
  Bell,
  AlertTriangle,
  Radio,
  Clock,
  ChevronDown,
  Layers,
  User,
  Sliders,
  LogOut,
  HelpCircle,
  FileCheck2,
  Check,
  MapPin,
  Mic,
  Globe,
} from "lucide-react";
import { formatUtcTime, formatLocalTime } from "@/lib/utils/cn";
import { TacticalBadge } from "../ui/TacticalBadge";
import { DemoModeBadge } from "../ui/DemoModeBadge";
import { OPERATING_SCOPES } from "@/lib/constants/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { notificationService } from "@/lib/services/notificationService";
import { NotificationItem } from "@/lib/types/isie";
import { MapsGroundingModal } from "../intel/MapsGroundingModal";
import { AudioTranscribeModal } from "../intel/AudioTranscribeModal";
import { SearchGroundingModal } from "../intel/SearchGroundingModal";

interface TopCommandBarProps {
  onOpenCommandPalette: () => void;
  title?: string;
  scopeBadge?: string;
}

export const TopCommandBar: React.FC<TopCommandBarProps> = ({
  onOpenCommandPalette,
  title,
}) => {
  const router = useRouter();
  const { user, logout, isDemoMode } = useAuth();
  const [utcTime, setUtcTime] = useState("");
  const [localTime, setLocalTime] = useState("");
  const [selectedScope, setSelectedScope] = useState(OPERATING_SCOPES[0]);
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mapsModalOpen, setMapsModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [transcribeModalOpen, setTranscribeModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const updateTime = () => {
      setUtcTime(formatUtcTime());
      setLocalTime(formatLocalTime());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    notificationService.getNotifications().then(setNotifications);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    await Promise.all(notifications.map((n) => notificationService.markAsRead(n.id)));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkSingleRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <header className="h-14 border-b border-white/10 bg-isie-panel/90 backdrop-blur-xl px-4 flex items-center justify-between z-20 select-none shadow-sm relative">
      {/* Left: Operating Scope & Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
        {/* Scope Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setScopeDropdownOpen(!scopeDropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-isie-panel border border-white/10 hover:border-isie-cyan/40 rounded-sm font-mono text-xs transition-colors shrink-0"
          >
            <Layers className="w-3.5 h-3.5 text-isie-cyan shrink-0" />
            <span className="font-semibold text-isie-text-primary tracking-wider">
              {selectedScope.code}
            </span>
            <span className="hidden xl:inline text-isie-text-muted">|</span>
            <span className="hidden xl:inline text-isie-text-secondary truncate max-w-[140px]">
              {selectedScope.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-isie-text-muted shrink-0" />
          </button>

          {scopeDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-[calc(100vw-2rem)] sm:w-72 max-w-xs bg-isie-panel border border-white/15 rounded-sm shadow-2xl p-1 z-50">
              <div className="px-2 py-1 text-[10px] font-mono text-isie-text-dim uppercase tracking-wider">
                Select Active Domain Scope
              </div>
              {OPERATING_SCOPES.map((scope) => (
                <button
                  key={scope.id}
                  onClick={() => {
                    setSelectedScope(scope);
                    setScopeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 text-left rounded-xs font-mono text-xs transition-colors ${
                    selectedScope.id === scope.id
                      ? "bg-sky-950/40 text-sky-200 border border-sky-500/30"
                      : "text-isie-text-secondary hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div>
                    <div className="font-semibold">{scope.code}</div>
                    <div className="text-[10px] text-isie-text-dim">{scope.name}</div>
                  </div>
                  {scope.activeWatch && (
                    <TacticalBadge variant="orange" size="sm">
                      PRIMARY
                    </TacticalBadge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {title && (
          <div className="hidden lg:flex items-center gap-2 border-l border-white/10 pl-3">
            <span className="font-mono text-xs tracking-wider text-isie-text-primary uppercase font-medium">
              {title}
            </span>
          </div>
        )}
      </div>

      {/* Center: Command Search Bar Button */}
      <div className="flex-1 max-w-xs xl:max-w-md mx-3 lg:mx-4 hidden md:block">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-isie-panel/70 border border-white/10 hover:border-isie-primary/50 rounded-sm font-mono text-xs text-isie-text-muted transition-all group"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-isie-text-muted group-hover:text-isie-primary transition-colors" />
            <span className="truncate">Search incidents, regions...</span>
          </div>
          <kbd className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded text-isie-text-dim group-hover:border-isie-primary/30">
            <Command className="w-3 h-3" />
            <span>K</span>
          </kbd>
        </button>
      </div>

      {/* Right: Telemetry Time, Demo Badge, Alerts, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 shrink-0">
        {/* Live Clocks */}
        <div className="hidden xl:flex items-center gap-3 px-2.5 py-1 bg-isie-panel border border-white/5 rounded-sm font-mono text-xs">
          <div className="flex items-center gap-1.5 text-isie-cyan">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[11px] tracking-wider">{utcTime || "SYNCING UTC..."}</span>
          </div>
          <div className="w-[1px] h-3 bg-white/10" />
          <div className="text-[11px] text-isie-text-muted tracking-wider">
            LOC: {localTime}
          </div>
        </div>

        {/* Demo Mode Badge */}
        <DemoModeBadge />

        {/* Google Search Grounding Trigger */}
        <button
          onClick={() => setSearchModalOpen(true)}
          className="relative p-2 text-isie-text-secondary hover:text-amber-400 hover:bg-amber-950/30 rounded-sm transition-colors group"
          title="Google Search grounding (Gemini)"
        >
          <Globe className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="sr-only">Search Grounding</span>
        </button>

        {/* Google Maps Grounding Trigger */}
        <button
          onClick={() => setMapsModalOpen(true)}
          className="relative p-2 text-isie-text-secondary hover:text-sky-400 hover:bg-sky-950/30 rounded-sm transition-colors group"
          title="Google Maps grounding (Gemini)"
        >
          <MapPin className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
          <span className="sr-only">Maps Grounding</span>
        </button>

        {/* Audio Transcribe Trigger */}
        <button
          onClick={() => setTranscribeModalOpen(true)}
          className="relative p-2 text-isie-text-secondary hover:text-amber-400 hover:bg-amber-950/30 rounded-sm transition-colors group"
          title="Transcribe user-provided audio (Gemini)"
        >
          <Mic className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="sr-only">Voice Transcribe</span>
        </button>

        {/* Quick Alert Center Trigger */}
        <Link
          href="/alerts"
          className="relative p-2 text-isie-text-secondary hover:text-amber-400 hover:bg-white/5 rounded-sm transition-colors"
          title="Active Alert Center"
        >
          <AlertTriangle className="w-4 h-4 text-amber-500/80" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
        </Link>

        {/* Notifications Dropdown Trigger */}
        <div className="relative">
          <button
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="relative p-2 text-isie-text-secondary hover:text-white hover:bg-white/5 rounded-sm transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 px-1 bg-isie-primary text-black font-mono font-bold text-[9px] rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationOpen && (
            <div className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-96 max-w-sm bg-isie-panel border border-white/15 rounded-sm shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
                    Platform Dispatch
                  </span>
                  <TacticalBadge variant="cyan" size="sm">
                    {unreadCount} UNREAD
                  </TacticalBadge>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-mono text-isie-cyan hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleMarkSingleRead(item.id)}
                    className={`p-2.5 rounded-xs border text-left cursor-pointer transition-colors ${
                      item.read
                        ? "bg-white/[0.02] border-white/5 text-isie-text-muted"
                        : "bg-sky-950/30 border-sky-500/30 text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 font-mono text-[10px]">
                      <span className={item.read ? "text-isie-text-dim" : "text-isie-cyan font-bold"}>
                        {item.category.replace("_", " ")}
                      </span>
                      <span className="text-isie-text-dim">{item.timestamp}</span>
                    </div>
                    <div className="font-mono text-xs font-semibold leading-tight mb-1">
                      {item.title}
                    </div>
                    <p className="text-[11px] text-isie-text-secondary leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-2 border-t border-white/10 flex justify-between items-center text-[10px] font-mono">
                <Link
                  href="/notifications"
                  onClick={() => setNotificationOpen(false)}
                  className="text-isie-primary hover:underline font-semibold"
                >
                  OPEN NOTIFICATION CENTER →
                </Link>
                <span className="text-isie-text-dim">WORKSPACE NOTIFICATIONS</span>
              </div>
            </div>
          )}
        </div>

        {/* Officer Profile Dropdown Trigger */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1.5 bg-isie-panel hover:bg-isie-panel-elevated border border-white/10 hover:border-isie-cyan/40 rounded-sm transition-colors"
            title="Strategic Command Profile"
          >
            <div className="w-6 h-6 rounded-xs bg-slate-800 border border-white/20 flex items-center justify-center font-mono text-xs font-bold text-isie-cyan">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="hidden sm:inline font-mono text-xs text-isie-text-primary tracking-wider font-semibold">
              {user?.callsign || "DIR-OP"}
            </span>
            <ChevronDown className="w-3 h-3 text-isie-text-muted" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-72 max-w-xs bg-isie-panel border border-white/15 rounded-sm shadow-2xl p-3 z-50 select-none">
              {/* Profile Card Header */}
              <div className="pb-3 mb-3 border-b border-white/10">
                <div className="font-mono text-xs font-bold text-white uppercase">
                  {user?.name || "Demo User"}
                </div>
                <div className="text-[11px] font-mono text-amber-400 mt-0.5">
                  {user?.role || "Command / Decision Maker"}
                </div>
                <div className="text-[10px] font-mono text-isie-text-dim mt-0.5">
                  {user?.email || "demo@isie.ai"}
                </div>
                <div className="mt-2">
                  <TacticalBadge variant="cyan" size="sm">
                    {user?.clearance || "Level 4 Clearance"}
                  </TacticalBadge>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1 font-mono text-xs">
                <Link
                  href="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 text-isie-text-secondary hover:text-white hover:bg-white/5 rounded-xs transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-isie-cyan" />
                  <span>Dossier Profile</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 text-isie-text-secondary hover:text-white hover:bg-white/5 rounded-xs transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5 text-isie-primary" />
                  <span>System Settings</span>
                </Link>

                <Link
                  href="/notifications"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 text-isie-text-secondary hover:text-white hover:bg-white/5 rounded-xs transition-colors"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span>Notifications Console</span>
                </Link>

                <Link
                  href="/help"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 text-isie-text-secondary hover:text-white hover:bg-white/5 rounded-xs transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tactical Help & Docs</span>
                </Link>
              </div>

              {/* Logout Button */}
              <div className="pt-3 mt-3 border-t border-white/10">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-500/30 rounded-xs font-mono text-xs transition-colors"
                >
                  <span>Logout Session</span>
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Google Search Grounding Modal */}
      <SearchGroundingModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

      {/* Google Maps Grounding Modal */}
      <MapsGroundingModal
        isOpen={mapsModalOpen}
        onClose={() => setMapsModalOpen(false)}
      />

      {/* Audio Transcribe & Voice Dispatch Modal */}
      <AudioTranscribeModal
        isOpen={transcribeModalOpen}
        onClose={() => setTranscribeModalOpen(false)}
      />
    </header>
  );
};
