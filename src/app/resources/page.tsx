"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Truck, ShieldCheck, Users, HeartPulse, Droplets, Building, Search, Filter, Plus, X } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { resourceService } from "@/lib/services/resourceService";
import { ResponseResource } from "@/data/demo/resources";
import { useAuth } from "@/lib/auth/AuthContext";
import { hasPermission } from "@/lib/auth/roles";

export default function ResourcesPage() {
  const { user, isDemoMode } = useAuth();
  const [resources, setResources] = useState<ResponseResource[]>([]);
  const [loadError, setLoadError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "RELIEF_SHELTER" as ResponseResource["category"],
    location: "",
    sector: "",
    totalCapacity: "",
    currentAllocated: "",
    status: "STANDBY" as ResponseResource["status"],
    contactCallsign: "",
  });
  const canManageResources = !!user && hasPermission(user.role, "canCreateIncident") && !isDemoMode;

  const loadResources = async () => {
    setLoadError("");
    try {
      setResources(await resourceService.getResources(categoryFilter, isDemoMode));
    } catch {
      setResources([]);
      setLoadError("Could not load workspace records. Check the Firestore connection and access rules, then retry.");
    }
  };

  useEffect(() => {
    loadResources();
  }, [categoryFilter, isDemoMode]);

  const saveResource = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !canManageResources) return;
    setSaving(true);
    setSaveError("");
    try {
      const totalCapacity = Number(form.totalCapacity);
      const currentAllocated = Number(form.currentAllocated);
      if (
        !Number.isInteger(totalCapacity) ||
        !Number.isInteger(currentAllocated) ||
        totalCapacity < 1 ||
        currentAllocated < 0 ||
        currentAllocated > totalCapacity
      ) {
        throw new Error("Capacity and allocated values must be whole numbers; allocation cannot exceed capacity.");
      }
      await resourceService.createResource({
        name: form.name,
        category: form.category,
        location: form.location,
        sector: form.sector,
        totalCapacity,
        currentAllocated,
        status: form.status,
        contactCallsign: form.contactCallsign,
      });
      setShowCreate(false);
      setForm({
        name: "",
        category: "RELIEF_SHELTER",
        location: "",
        sector: "",
        totalCapacity: "",
        currentAllocated: "",
        status: "STANDBY",
        contactCallsign: "",
      });
      await loadResources();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save the resource record.");
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    { id: "ALL", label: "All Assets" },
    { id: "DISASTER_BATTALION", label: "NDRF Battalions" },
    { id: "RELIEF_SHELTER", label: "Relief Shelters" },
    { id: "HEALTHCARE_UNIT", label: "Medical Teams" },
    { id: "WATER_LOGISTICS", label: "Water & Logistics" },
  ];

  return (
    <AppShell pageTitle="Resources // Disaster Battalions, Safe Havens & Logistics">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-5 h-5 text-isie-primary" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Disaster Response & Shelter Logistics
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              User-entered response resource records. Availability, occupancy, and readiness are not independently verified.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant="safe" size="sm">
              WORKSPACE RECORDS: {resources.length}
            </TacticalBadge>
            {canManageResources && (
              <button
                type="button"
                onClick={() => setShowCreate((open) => !open)}
                className="inline-flex items-center gap-1 rounded border border-cyan-500/30 px-3 py-1.5 font-mono text-xs text-cyan-300 hover:bg-cyan-500/10"
              >
                {showCreate ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {showCreate ? "CANCEL" : "ADD WORKSPACE RECORD"}
              </button>
            )}
          </div>
        </div>

        {showCreate && (
          <form onSubmit={saveResource} className="grid grid-cols-1 gap-3 rounded border border-white/10 bg-isie-panel p-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["name", "Resource name"],
              ["location", "Location"],
              ["sector", "Sector / area"],
              ["contactCallsign", "Contact reference"],
              ["totalCapacity", "Total capacity"],
              ["currentAllocated", "Currently allocated"],
            ].map(([key, label]) => (
              <label key={key} className="space-y-1 font-mono text-[10px] uppercase text-isie-text-muted">
                {label}
                <input
                  required
                  type={key === "totalCapacity" || key === "currentAllocated" ? "number" : "text"}
                  min={key === "totalCapacity" ? 1 : key === "currentAllocated" ? 0 : undefined}
                  value={form[key as keyof typeof form]}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  className="w-full rounded border border-white/10 bg-black/20 px-3 py-2 text-xs normal-case text-white"
                />
              </label>
            ))}
            <label className="space-y-1 font-mono text-[10px] uppercase text-isie-text-muted">
              Category
              <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as ResponseResource["category"] }))} className="w-full rounded border border-white/10 bg-black/20 px-3 py-2 text-xs text-white">
                {categories.slice(1).map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                <option value="ENGINEERING">Engineering</option>
              </select>
            </label>
            <label className="space-y-1 font-mono text-[10px] uppercase text-isie-text-muted">
              Reported status
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ResponseResource["status"] }))} className="w-full rounded border border-white/10 bg-black/20 px-3 py-2 text-xs text-white">
                {(["STANDBY", "DEPLOYED", "EN_ROUTE", "SATURATED"] as const).map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <div className="flex items-end">
              <button disabled={saving} className="rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-mono text-xs text-cyan-200 disabled:opacity-50">
                {saving ? "SAVING..." : "SAVE WORKSPACE RECORD"}
              </button>
            </div>
            {saveError && <p role="alert" className="text-xs text-red-300 sm:col-span-2 lg:col-span-4">{saveError}</p>}
          </form>
        )}

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`px-3 py-1.5 rounded-xs uppercase tracking-wider transition-colors border ${
                categoryFilter === c.id
                  ? "bg-isie-primary/20 text-isie-primary border-isie-primary/50 font-semibold"
                  : "bg-isie-panel border-white/10 text-isie-text-muted hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loadError && (
          <p role="alert" className="rounded border border-red-500/30 bg-red-950/20 p-3 font-mono text-xs text-red-300">
            {loadError}
          </p>
        )}

        {/* Resource Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
          {resources.map((res) => (
            <div
              key={res.id}
              className="p-5 bg-isie-panel border border-white/10 rounded-sm flex flex-col justify-between space-y-4 min-w-0"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-isie-cyan font-semibold">
                    {res.id}
                  </span>
                  <TacticalBadge
                    variant={
                      res.status === "DEPLOYED"
                        ? "orange"
                        : res.status === "EN_ROUTE"
                        ? "warning"
                        : "safe"
                    }
                    size="sm"
                  >
                    {res.status}
                  </TacticalBadge>
                </div>

                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider mb-1">
                  {res.name}
                </h3>
                <div className="text-xs text-isie-text-secondary flex items-center gap-1.5 mb-3">
                  <span>{res.location}</span>
                  <span className="text-white/20">•</span>
                  <span className="text-isie-text-dim">{res.sector}</span>
                </div>

                {/* Progress of Allocation */}
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-isie-text-dim">
                    <span>REPORTED OCCUPANCY</span>
                    <span className="text-white font-semibold">
                      {res.currentAllocated.toLocaleString()} / {res.totalCapacity.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-isie-primary rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (res.currentAllocated / res.totalCapacity) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-isie-text-dim">
                <span>CONTACT REFERENCE: {res.contactCallsign}</span>
                <span>
                  {typeof res.readinessPercentage === "number"
                    ? `REPORTED READINESS: ${res.readinessPercentage}%`
                    : "READINESS: NOT REPORTED"}
                </span>
              </div>
            </div>
          ))}
          {resources.length === 0 && (
            <p className="rounded border border-white/10 bg-isie-panel p-6 font-mono text-xs text-isie-text-dim md:col-span-2 lg:col-span-3">
              {isDemoMode
                ? "No demo resource records match this filter."
                : "No resource records are stored for this filter. No availability or readiness is inferred."}
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
