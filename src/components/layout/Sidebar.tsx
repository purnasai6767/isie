"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Globe2,
  Flame,
  MapPin,
  Activity,
  Clock,
  FileCheck2,
  Cpu,
  BellRing,
  Radio,
  UserCheck,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Database,
  Server,
  Layers,
  Truck,
  HelpCircle,
} from "lucide-react";
import { NAVIGATION_SECTIONS } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";
import { TacticalBadge } from "../ui/TacticalBadge";
import { DemoModeBadge } from "../ui/DemoModeBadge";

const ICON_MAP: Record<string, React.ElementType> = {
  ShieldAlert,
  Globe2,
  Flame,
  MapPin,
  Activity,
  Clock,
  FileCheck2,
  Cpu,
  BellRing,
  Radio,
  UserCheck,
  SlidersHorizontal,
  Database,
  Server,
  Truck,
  HelpCircle,
};

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setCollapsed(true);
    }
  }, []);

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen border-r border-white/10 bg-isie-panel transition-all duration-300 z-30 select-none shrink-0",
        collapsed ? "w-14 sm:w-16" : "w-56 sm:w-64"
      )}
    >
      {/* Brand Identity Header */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-white/10 bg-isie-panel-light/40">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-isie-primary to-orange-700 flex items-center justify-center font-mono font-bold text-black text-sm shadow-[0_0_12px_rgba(255,122,24,0.4)]">
              IS
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-sm font-bold tracking-widest text-isie-text-primary uppercase leading-tight">
                ISIE <span className="text-isie-primary text-xs">CORE</span>
              </span>
              <span className="text-[9px] font-mono text-isie-text-muted tracking-wider">
                STRATEGIC INTEL ENGINE
              </span>
            </div>
          </Link>
        )}

        {collapsed && (
          <div className="w-8 h-8 rounded-sm mx-auto bg-gradient-to-br from-isie-primary to-orange-700 flex items-center justify-center font-mono font-bold text-black text-sm shadow-[0_0_12px_rgba(255,122,24,0.4)]">
            IS
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-sm text-isie-text-muted hover:text-white hover:bg-white/5 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin">
        {NAVIGATION_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <div className="px-2 text-[10px] font-mono tracking-widest text-isie-text-dim uppercase font-semibold">
                {section.title}
              </div>
            )}
            {collapsed && (
              <div className="h-[1px] bg-white/5 my-2 mx-1" />
            )}

            {section.items.map((item) => {
              const Icon = ICON_MAP[item.iconName] || Layers;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-2.5 py-2 rounded-xs font-mono text-xs transition-all duration-150 relative group",
                    isActive
                      ? "bg-gradient-to-r from-isie-primary/15 via-isie-primary/5 to-transparent text-white border-l-2 border-isie-primary shadow-[inset_0_0_12px_rgba(255,122,24,0.12)] font-semibold"
                      : "text-isie-text-secondary hover:text-white hover:bg-white/[0.04] hover:translate-x-0.5"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      isActive ? "text-isie-primary" : "text-isie-text-muted group-hover:text-isie-cyan"
                    )}
                  />

                  {!collapsed && (
                    <span className="truncate tracking-wide flex-1">{item.label}</span>
                  )}

                  {!collapsed && item.badge && (
                    <TacticalBadge
                      variant={item.badgeVariant || "cyan"}
                      size="sm"
                    >
                      {item.badge}
                    </TacticalBadge>
                  )}

                  {/* Tooltip on Collapsed Mode */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2.5 py-1 bg-isie-panel-elevated border border-white/10 rounded-sm text-xs text-white tracking-wide whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* System Status & Demo Badge Footer */}
      <div className="p-3 border-t border-white/10 bg-isie-panel-light/30">
        {!collapsed ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-isie-text-muted">SYSTEM STATUS</span>
              <DemoModeBadge />
            </div>
            <div className="text-[10px] font-mono text-isie-text-dim truncate">
              LIVE INGESTION: NOT CONNECTED
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <span
              className="w-2 h-2 rounded-full bg-slate-500"
              title="Live ingestion not connected"
            />
          </div>
        )}
      </div>
    </aside>
  );
};
