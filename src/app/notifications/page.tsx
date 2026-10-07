"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Bell, Radio, Check, Trash2, Filter, CheckCircle2, ArrowRight } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { notificationService } from "@/lib/services/notificationService";
import { useAuth } from "@/lib/auth/AuthContext";
import { NotificationItem } from "@/lib/types/isie";

export default function NotificationsPage() {
  const { isDemoMode } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    notificationService.getNotifications(isDemoMode).then(setNotifications);
  }, [isDemoMode]);

  const handleMarkAllRead = async () => {
    setActionError("");
    const results = await Promise.all(
      notifications.map((n) => notificationService.markAsRead(n.id, isDemoMode))
    );
    if (results.every(Boolean)) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } else {
      setActionError("Some notifications could not be updated. Check your account permissions and connection.");
    }
  };

  const handleClear = async () => {
    setActionError("");
    if (await notificationService.clearAll(isDemoMode)) {
      setNotifications([]);
    } else {
      setActionError("Notifications could not be cleared. Check your account permissions and connection.");
    }
  };

  const handleMarkSingle = async (id: string) => {
    setActionError("");
    if (await notificationService.markAsRead(id, isDemoMode)) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } else {
      setActionError("Notification could not be updated. Check your account permissions and connection.");
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "ALL") return true;
    if (filter === "CRITICAL") return n.category === "CRITICAL_ALERT";
    if (filter === "INTEL") return n.category === "INTEL_UPDATE";
    if (filter === "SYSTEM") return n.category === "SYSTEM";
    return true;
  });

  return (
    <AppShell pageTitle="Notifications // Platform Dispatch & Feed Broadcasts">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-5xl mx-auto w-full select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Radio className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Dispatch & Platform Notifications
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Ingestion telemetry logs, cluster node status updates, and system advisory notices.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant="cyan" size="sm">
              {notifications.filter((n) => !n.read).length} UNREAD BROADCASTS
            </TacticalBadge>
          </div>
        </div>

        {/* Filter Controls & Actions */}
        {actionError && <p role="alert" className="text-xs text-red-300">{actionError}</p>}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            {["ALL", "CRITICAL", "INTEL", "SYSTEM"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xs uppercase tracking-wider transition-colors border ${
                  filter === f
                    ? "bg-sky-950/40 text-sky-200 border-sky-500/40 font-semibold"
                    : "bg-isie-panel border-white/10 text-isie-text-muted hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <TacticalButton
              variant="secondary"
              size="sm"
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              onClick={handleMarkAllRead}
            >
              MARK ALL READ
            </TacticalButton>
            <TacticalButton
              variant="ghost"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={handleClear}
            >
              CLEAR LOG
            </TacticalButton>
          </div>
        </div>

        {/* Notification List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="p-8 bg-isie-panel border border-white/10 rounded-sm text-center font-mono text-xs text-isie-text-muted">
              NO NOTIFICATIONS IN SELECTED CATEGORY
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => handleMarkSingle(item.id)}
                className={`p-4 rounded-sm border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.read
                    ? "bg-isie-panel/60 border-white/5 text-isie-text-muted"
                    : "bg-isie-panel border-sky-500/40 text-white shadow-[0_0_12px_rgba(56,189,248,0.1)]"
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <TacticalBadge
                      variant={
                        item.category === "CRITICAL_ALERT"
                          ? "critical"
                          : item.category === "INTEL_UPDATE"
                          ? "cyan"
                          : "muted"
                      }
                      size="sm"
                    >
                      {item.category.replace("_", " ")}
                    </TacticalBadge>
                    <span className="text-[11px] text-isie-text-dim">{item.timestamp}</span>
                  </div>

                  <h3 className="font-mono text-sm font-semibold text-white break-words">
                    {item.title}
                  </h3>
                  <p className="text-xs text-isie-text-secondary break-words">
                    {item.message}
                  </p>
                </div>

                {item.actionUrl && (
                  <Link
                    href={item.actionUrl}
                    className="shrink-0 flex items-center gap-1 text-xs font-mono text-isie-primary hover:underline font-semibold"
                  >
                    <span>OPEN MODULE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
