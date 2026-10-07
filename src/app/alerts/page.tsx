"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { BellRing, ShieldAlert, Filter, CheckCircle2, VolumeX, Trash2, Search, ArrowRight, AlertTriangle } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { alertService } from "@/lib/services/alertService";
import { useAuth } from "@/lib/auth/AuthContext";
import { Alert } from "@/lib/types/isie";

export default function AlertCenterPage() {
  const { isDemoMode } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    alertService.getActiveAlerts(isDemoMode).then((data) => {
      if (!active) return;
      setAlerts(data);
      setSelectedAlert((selected) => data.find((alert) => alert.id === selected?.id) ?? data[0] ?? null);
    }).catch((error) => {
      if (active) setLoadError(error instanceof Error ? error.message : "Could not load alert records.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [isDemoMode]);

  const handleAcknowledge = async (id: string) => {
    setActing(true);
    setActionError("");
    try {
      await alertService.acknowledgeAlert(id, isDemoMode);
      setAlerts((prev) => prev.map((alert) => alert.id === id ? { ...alert, status: "ACKNOWLEDGED" as const } : alert));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not acknowledge the alert record.");
    } finally {
      setActing(false);
    }
  };

  const handleDismiss = async (id: string) => {
    setActing(true);
    setActionError("");
    try {
      await alertService.dismissAlert(id, isDemoMode);
      const remaining = alerts.filter((alert) => alert.id !== id);
      setAlerts(remaining);
      if (selectedAlert?.id === id) setSelectedAlert(remaining[0] ?? null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not dismiss the alert record.");
    } finally {
      setActing(false);
    }
  };

  const handleAcknowledgeAll = async () => {
    setActing(true);
    setActionError("");
    try {
      await Promise.all(alerts.map((alert) => alertService.acknowledgeAlert(alert.id, isDemoMode)));
      setAlerts((current) => current.map((alert) => ({ ...alert, status: "ACKNOWLEDGED" as const })));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Some alert records could not be acknowledged.");
      try {
        const current = await alertService.getActiveAlerts(isDemoMode);
        setAlerts(current);
        setSelectedAlert((selected) => current.find((alert) => alert.id === selected?.id) ?? current[0] ?? null);
      } catch (reloadError) {
        setActionError(reloadError instanceof Error ? reloadError.message : "Could not reload alert records after the failed action.");
      }
    } finally {
      setActing(false);
    }
  };

  const filteredAlerts = alerts.filter(
    (a) => filterSeverity === "ALL" || a.severity === filterSeverity
  );

  return (
    <AppShell pageTitle="Alert Center // Demo & Workspace Alert Records">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BellRing className="w-5 h-5 text-amber-400" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Alert Records
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              {isDemoMode
                ? "Synthetic exercise alerts for interface demonstration only."
                : "User-entered workspace records. No external warning feed or dispatch service is connected."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant="critical" size="sm" pulse>
              {alerts.filter((a) => a.severity === "CRITICAL").length} {isDemoMode ? "SAMPLE RECORDS" : "REPORTED CRITICAL"}
            </TacticalBadge>
          </div>
        </div>

        {/* Severity Filters & Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-3 py-1.5 rounded-xs uppercase tracking-wider transition-colors border ${
                  filterSeverity === sev
                    ? "bg-amber-950/40 text-amber-300 border-amber-500/40 font-semibold"
                    : "bg-isie-panel border-white/10 text-isie-text-muted hover:text-white"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <TacticalButton
              variant="secondary"
              size="sm"
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              onClick={handleAcknowledgeAll}
              disabled={acting || alerts.length === 0}
            >
              ACKNOWLEDGE ALL
            </TacticalButton>
          </div>
        </div>

        {loadError && <p role="alert" className="rounded border border-red-500/30 bg-red-950/20 p-3 font-mono text-xs text-red-300">{loadError}</p>}
        {actionError && <p role="alert" className="rounded border border-red-500/30 bg-red-950/20 p-3 font-mono text-xs text-red-300">{actionError}</p>}

        {/* Main Grid: Alert List & Detail Action Console */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
          {/* Alert Queue */}
          <div className="lg:col-span-6 min-w-0 space-y-3 max-h-[640px] overflow-y-auto pr-1 scrollbar-thin">
            {loading ? (
              <p className="p-4 font-mono text-xs text-isie-text-dim">Loading alert records…</p>
            ) : filteredAlerts.length === 0 ? (
              <EmptyState
                icon="alert"
                title="No Active Alerts"
                description={
                  isDemoMode
                    ? "No alerts match the selected severity filter."
                    : "No alert records are available in this workspace."
                }
                statusText="CLEAR AIRWAVES"
              />
            ) : (
              filteredAlerts.map((alert) => {
              const isSelected = selectedAlert?.id === alert.id;

              return (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className={`p-4 rounded-sm border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-isie-panel-elevated border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                      : "bg-isie-panel border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-bold text-white">{alert.alertCode}</span>
                      <TacticalBadge
                        variant={
                          alert.severity === "CRITICAL"
                            ? "critical"
                            : alert.severity === "HIGH"
                            ? "orange"
                            : alert.severity === "MEDIUM"
                            ? "warning"
                            : "muted"
                        }
                        size="sm"
                        pulse={alert.severity === "CRITICAL"}
                      >
                        {alert.severity}
                      </TacticalBadge>
                      <TacticalBadge variant="muted" size="sm">
                        {alert.status}
                      </TacticalBadge>
                    </div>
                    <span className="font-mono text-[10px] text-isie-text-dim">
                      {alert.timestamp}
                    </span>
                  </div>

                  <h3 className="font-mono text-sm font-semibold text-white mb-2 leading-snug">
                    {alert.title}
                  </h3>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-isie-text-secondary font-mono">
                    <span>{alert.location}</span>
                    <span className="text-isie-cyan">{alert.sourceAgency}</span>
                  </div>
                </div>
              );
            }))}
          </div>

          {/* Alert Detail & Dispatch Actions */}
          <div className="lg:col-span-6 min-w-0 p-4 sm:p-6 bg-isie-panel border border-white/10 rounded-sm flex flex-col justify-between">
            {selectedAlert ? (
              <div className="space-y-6 font-mono text-xs">
                <div className="pb-4 border-b border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <TacticalBadge
                      variant={
                        selectedAlert.severity === "CRITICAL"
                          ? "critical"
                          : selectedAlert.severity === "HIGH"
                          ? "orange"
                          : "warning"
                      }
                      size="md"
                    >
                      {selectedAlert.severity} // {selectedAlert.alertType}
                    </TacticalBadge>
                    <span className="text-isie-text-dim">{selectedAlert.timestamp}</span>
                  </div>

                  <h2 className="text-lg font-bold text-white uppercase tracking-wider mt-2">
                    {selectedAlert.title}
                  </h2>
                  <div className="text-isie-text-secondary mt-1">
                    TARGET: {selectedAlert.location}
                  </div>
                </div>

                <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xs space-y-2">
                  <div className="text-amber-300 font-bold uppercase tracking-wider">
                    {isDemoMode ? "Demo Response Text" : "User-Entered Response Text"}
                  </div>
                  <p className="text-isie-text-primary leading-relaxed">
                    {selectedAlert.recommendedAction}
                  </p>
                  <p className="border-t border-white/10 pt-2 text-[10px] text-amber-200/80">
                    Prototype content only. This is not a verified recommendation, official alert, or dispatch instruction.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-isie-text-dim">
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xs">
                    <div>REPORTED SOURCE LABEL · UNVERIFIED</div>
                    <div className="text-white font-bold mt-1">{selectedAlert.sourceAgency}</div>
                  </div>
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xs">
                    <div>REPORTED CONFIDENCE · UNVERIFIED</div>
                    <div className="text-emerald-400 font-bold mt-1">
                      {(selectedAlert.confidenceScore * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {selectedAlert.relatedEventId && (
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xs flex items-center justify-between">
                    <div>
                      <span className="text-isie-text-dim block">CORRELATED CRISIS EVENT:</span>
                      <span className="text-white font-semibold">{selectedAlert.relatedEventId}</span>
                    </div>
                    <Link
                      href="/incidents"
                      className="text-isie-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>VIEW INCIDENT</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            ) : null}

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              {selectedAlert && (
                <>
                  <div className="flex items-center gap-2">
                    <TacticalButton
                      variant="primary"
                      size="sm"
                      onClick={() => handleAcknowledge(selectedAlert.id)}
                      disabled={acting}
                    >
                      ACKNOWLEDGE
                    </TacticalButton>
                    <TacticalButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss(selectedAlert.id)}
                      disabled={acting}
                    >
                      DISMISS
                    </TacticalButton>
                  </div>
                  <Link href="/resources">
                    <TacticalButton variant="secondary" size="sm">
                      VIEW RESOURCE RECORDS
                    </TacticalButton>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
