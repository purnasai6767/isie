"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { FileCheck2, Database, ShieldCheck, ExternalLink, Search, Filter, AlertCircle, Eye, CheckCircle2 } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { AUTHORITATIVE_SOURCES } from "@/lib/constants/tacticalLayers";
import { intelligenceService } from "@/lib/services/intelligenceService";
import { EvidenceItem } from "@/lib/types/isie";

export default function IntelligenceEvidencePage() {
  const [activeTab, setActiveTab] = useState<"SOURCES" | "EVIDENCE_FEED">("EVIDENCE_FEED");
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);

  useEffect(() => {
    intelligenceService.getAllAuthoritativeEvidence().then(setEvidenceList);
  }, []);

  return (
    <AppShell pageTitle="Evidence & Sources // Authoritative Verification & Sensor Registry">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileCheck2 className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Intelligence Sources & Multi-Source Verification
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Authoritative sensor telemetry, satellite SAR cross-validation, and auditable verification pipelines.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TacticalBadge variant="cyan" size="sm">
              EVIDENCE ITEMS: {evidenceList.length}
            </TacticalBadge>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-white/10 font-mono text-xs">
          <button
            onClick={() => setActiveTab("EVIDENCE_FEED")}
            className={`px-4 py-2 border-b-2 uppercase tracking-wider transition-colors ${
              activeTab === "EVIDENCE_FEED"
                ? "border-isie-cyan text-isie-cyan font-semibold"
                : "border-transparent text-isie-text-muted hover:text-white"
            }`}
          >
            Fused Evidence Stream ({evidenceList.length})
          </button>
          <button
            onClick={() => setActiveTab("SOURCES")}
            className={`px-4 py-2 border-b-2 uppercase tracking-wider transition-colors ${
              activeTab === "SOURCES"
                ? "border-isie-primary text-isie-primary font-semibold"
                : "border-transparent text-isie-text-muted hover:text-white"
            }`}
          >
            Authoritative Ingestion Registry (6)
          </button>
        </div>

        {/* Content Tabs */}
        {activeTab === "EVIDENCE_FEED" && (
          <div className="space-y-4">
            {evidenceList.map((item) => (
              <div
                key={item.id}
                className="p-5 bg-isie-panel border border-white/10 rounded-sm flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                    <span className="text-white font-bold">{item.id}</span>
                    <TacticalBadge variant="muted" size="sm">
                      WORKSPACE RECORD · UNVERIFIED
                    </TacticalBadge>
                    <span className="text-isie-cyan font-semibold">
                      SOURCE: {item.sourceName}
                    </span>
                    <span className="text-isie-text-dim">{item.timestamp}</span>
                  </div>

                  <h3 className="font-mono text-base font-bold text-white uppercase tracking-wider">
                    {item.title}
                  </h3>

                  <p className="text-xs text-isie-text-secondary leading-relaxed bg-white/[0.02] p-3 rounded-xs border border-white/5">
                    {item.summary}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 font-mono text-[10px] text-isie-text-dim">
                    <div>SENSOR: {item.technicalMetadata.sensor}</div>
                    <div>RESOLUTION: {item.technicalMetadata.resolution}</div>
                    <div>LATENCY: {item.technicalMetadata.dataLatencyMinutes} MINS</div>
                    <div>CHECKSUM: {item.technicalMetadata.qcChecksum}</div>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col gap-2 font-mono text-xs">
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xs text-center">
                    <div className="text-[10px] text-isie-text-dim">OPERATOR-ENTERED CONFIDENCE</div>
                    <div className="text-emerald-400 font-bold text-base mt-0.5">
                      {(item.confidenceScore * 100).toFixed(0)}%
                    </div>
                  </div>
                  {item.authoritativeUrl && (
                    <a
                      href={item.authoritativeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-isie-text-primary rounded-xs flex items-center justify-center gap-1.5 transition-colors text-[11px]"
                    >
                      <span>PROVIDER PORTAL · NOT CONNECTED</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "SOURCES" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AUTHORITATIVE_SOURCES.map((source) => (
              <div
                key={source.id}
                className="p-5 bg-isie-panel border border-white/10 rounded-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-semibold text-white">
                      {source.name}
                    </span>
                    <TacticalBadge variant="safe" size="sm">
                      CATALOGED · DISCONNECTED
                    </TacticalBadge>
                  </div>
                  <div className="font-mono text-[10px] text-isie-cyan mb-2">
                    {source.endpointCategory} // {source.code}
                  </div>
                  <p className="text-xs text-isie-text-secondary leading-relaxed mb-4">
                    {source.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-isie-text-dim">
                  <span className="text-amber-400">PROVIDER: NOT CONNECTED</span>
                  <a
                    href={source.referenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-isie-primary hover:underline"
                  >
                    <span>PORTAL</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
