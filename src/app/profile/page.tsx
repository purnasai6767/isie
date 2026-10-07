"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { UserCheck, KeyRound, Globe, LogOut, Activity } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { useAuth } from "@/lib/auth/AuthContext";
import { DemoModeBadge } from "@/components/ui/DemoModeBadge";

export default function ProfilePage() {
  const { user, logout, isDemoMode } = useAuth();

  return (
    <AppShell pageTitle="Profile // Prototype Account Details">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-5xl mx-auto w-full select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Account Profile
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Authentication account details. Organization, role, callsign, and clearance claims are not independently validated by this prototype.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DemoModeBadge />
            <TacticalBadge variant="cyan" size="sm">
              {user?.clearance || "Not assigned"}
            </TacticalBadge>
          </div>
        </div>

        {/* Profile Card & Credentials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-w-0">
          <div className="p-6 bg-isie-panel border border-white/10 rounded-sm flex flex-col items-center text-center min-w-0">
            <div className="w-20 h-20 rounded-sm bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-isie-cyan flex items-center justify-center font-mono font-bold text-2xl text-isie-cyan shadow-xl mb-4 shrink-0">
              {user?.callsign ? user.callsign.slice(0, 3) : "DIR"}
            </div>
            <h3 className="font-mono text-base font-bold text-white uppercase tracking-wider truncate max-w-full">
              {user?.name || "Account"}
            </h3>
            <p className="text-xs font-mono text-amber-400 tracking-wider uppercase mt-0.5 mb-1 font-semibold truncate max-w-full">
              {user?.role || "Not assigned"}
            </p>
            <p className="text-[11px] font-mono text-isie-text-dim mb-4 truncate max-w-full">
              {user?.email || "—"}
            </p>

            <TacticalBadge variant="orange" size="sm" className="mb-4">
              CALLSIGN: {user?.callsign || "Not assigned"}
            </TacticalBadge>

            <div className="w-full pt-4 border-t border-white/10 font-mono text-xs text-isie-text-dim space-y-1.5 text-left">
              <div className="truncate">ORGANIZATION: <span className="text-white">{user?.organization || "Not configured"}</span></div>
              <div className="truncate">STATION: <span className="text-white">Not configured</span></div>
              <div className="truncate">SECURITY CLASSIFICATION: <span className="text-white">Not established</span></div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4 min-w-0">
            {/* Operating Assignment */}
            <div className="p-5 bg-isie-panel border border-white/10 rounded-sm space-y-4 font-mono text-xs min-w-0">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="font-semibold uppercase tracking-wider text-white">
                  Account Attributes
                </span>
                <Globe className="w-4 h-4 text-isie-text-muted" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-isie-text-dim text-[10px] uppercase">ORGANIZATION (PROFILE VALUE)</div>
                  <div className="font-semibold text-white mt-1">{user?.organization || "NOT CONFIGURED"}</div>
                </div>
                <div>
                  <div className="text-isie-text-dim text-[10px] uppercase">ROLE (PROFILE VALUE)</div>
                  <div className="font-semibold text-white mt-1">{user?.role || "NOT CONFIGURED"}</div>
                </div>
                <div>
                  <div className="text-isie-text-dim text-[10px] uppercase">CLEARANCE</div>
                  <div className="font-semibold text-amber-400 mt-1">{user?.clearance || "NOT ASSIGNED"}</div>
                </div>
                <div>
                  <div className="text-isie-text-dim text-[10px] uppercase">CALLSIGN</div>
                  <div className="font-semibold text-amber-400 mt-1">{user?.callsign || "NOT ASSIGNED"}</div>
                </div>
              </div>
            </div>

            {/* Activity Summary */}
            <div className="p-5 bg-isie-panel border border-white/10 rounded-sm space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="font-semibold uppercase tracking-wider text-white">
                  Recent Activity
                </span>
                <Activity className="w-4 h-4 text-isie-cyan" />
              </div>

              <div className="text-[11px] text-isie-text-dim">
                No authenticated activity audit log is available. Records and actions in the prototype are not presented here as audited events.
              </div>
            </div>

            {/* Security & Logout */}
            <div className="p-5 bg-isie-panel border border-white/10 rounded-sm space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="font-semibold uppercase tracking-wider text-white">
                  Security & Session Context
                </span>
                <KeyRound className="w-4 h-4 text-isie-text-muted" />
              </div>

              <div className="space-y-2 text-isie-text-secondary text-[11px]">
                <div className="flex justify-between">
                  <span>SESSION STATE:</span>
                  <span className="text-emerald-400 font-mono">AUTHENTICATED</span>
                </div>
                <div className="flex justify-between">
                  <span>ENVIRONMENT MODE:</span>
                  <span className="text-amber-400 font-mono">{isDemoMode ? "DEMO DATA" : "WORKSPACE ACCOUNT"}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end">
                <TacticalButton
                  variant="danger"
                  size="sm"
                  onClick={logout}
                  icon={<LogOut className="w-3.5 h-3.5" />}
                >
                  LOGOUT SESSION
                </TacticalButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
