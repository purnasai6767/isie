"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Database, ExternalLink, Globe2, RefreshCw, Server, ShieldAlert } from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { useEonetFeed } from "@/lib/hooks/useEonetFeed";
import { verifyFirestoreConnection } from "@/lib/firebase/client";

type ProbeState = "NOT CHECKED" | "CHECKING" | "CONNECTED" | "UNAVAILABLE";

export default function SystemStatusPage() {
  const { feed, error, loading, refresh } = useEonetFeed();
  const [firestoreState, setFirestoreState] = useState<ProbeState>("NOT CHECKED");
  const [checkingFirestore, setCheckingFirestore] = useState(false);

  const checkFirestore = async () => {
    setCheckingFirestore(true);
    setFirestoreState("CHECKING");
    try {
      setFirestoreState(await verifyFirestoreConnection() ? "CONNECTED" : "UNAVAILABLE");
    } catch {
      setFirestoreState("UNAVAILABLE");
    } finally {
      setCheckingFirestore(false);
    }
  };

  const eonetState: ProbeState = error ? "UNAVAILABLE" : loading ? "CHECKING" : "CONNECTED";
  const badgeVariant = (state: ProbeState) => {
    if (state === "CONNECTED") return "safe" as const;
    if (state === "UNAVAILABLE") return "warning" as const;
    return "muted" as const;
  };

  const unconnectedProviders = [
    "India Meteorological Department weather and radar",
    "Central Water Commission hydrology and gauges",
    "ISRO / NRSC disaster imagery",
    "Copernicus Sentinel event-analysis layers",
    "Population, shelter, healthcare, and road-status data",
    "Official alert distribution or emergency dispatch",
  ];

  return (
    <AppShell pageTitle="System Status // Prototype Integrations">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-5xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Server className="w-5 h-5 text-isie-cyan" />
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
                Integration Status
              </h1>
            </div>
            <p className="text-xs text-isie-text-secondary">
              Live checks report only the specific catalog or database probe shown. This prototype has no uptime monitor or emergency alert service.
            </p>
          </div>
          <TacticalBadge variant="warning" size="sm">PROTOTYPE · NOT FOR EMERGENCY OPERATIONS</TacticalBadge>
        </div>

        <section aria-labelledby="connected-services" className="space-y-3">
          <h2 id="connected-services" className="font-mono text-xs font-bold uppercase tracking-wider text-white">
            Configured services
          </h2>

          <div className="rounded border border-white/10 bg-isie-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-cyan-300" />
                <div>
                  <div className="font-mono text-xs font-semibold text-white">NASA EONET v3 public event catalog</div>
                  <div className="mt-1 text-[11px] text-isie-text-dim">
                    Limited open natural-event catalog; not an official alert, complete hazard inventory, or ground-condition verification.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TacticalBadge variant={badgeVariant(eonetState)} size="sm">{eonetState}</TacticalBadge>
                {error && (
                  <button type="button" onClick={refresh} aria-label="Retry NASA EONET check" className="rounded border border-white/10 p-2 text-slate-300 hover:text-white">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            {feed && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-[10px] text-isie-text-dim">
                <span>{feed.events.length} open catalog entries · retrieved {new Date(feed.fetchedAt).toLocaleString(undefined, { timeZone: "UTC", timeZoneName: "short" })}</span>
                <a href={feed.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-isie-cyan hover:underline">
                  Source <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {error && <p role="alert" className="mt-3 text-[11px] text-amber-200">{error}</p>}
          </div>

          <div className="rounded border border-white/10 bg-isie-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-cyan-300" />
                <div>
                  <div className="font-mono text-xs font-semibold text-white">Firebase / Firestore connection check</div>
                  <div className="mt-1 text-[11px] text-isie-text-dim">
                    Reads the configured connection-check document; this does not verify every collection&apos;s rules or write permissions.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TacticalBadge variant={badgeVariant(firestoreState)} size="sm">{firestoreState}</TacticalBadge>
                <button
                  type="button"
                  onClick={checkFirestore}
                  disabled={checkingFirestore}
                  className="rounded border border-cyan-300/20 px-2.5 py-1.5 font-mono text-[10px] text-cyan-200 hover:bg-cyan-300/10 disabled:opacity-50"
                >
                  {checkingFirestore ? "CHECKING…" : "CHECK"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="not-connected" className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-300" />
            <h2 id="not-connected" className="font-mono text-xs font-bold uppercase tracking-wider text-white">
              Not connected · no live operational capability
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {unconnectedProviders.map((provider) => (
              <div key={provider} className="flex items-center justify-between gap-2 rounded border border-white/10 bg-isie-panel p-3">
                <span className="text-[11px] text-isie-text-secondary">{provider}</span>
                <TacticalBadge variant="muted" size="sm">NOT CONNECTED</TacticalBadge>
              </div>
            ))}
          </div>
        </section>

        <p className="rounded border border-amber-500/20 bg-amber-950/10 p-3 text-[11px] leading-relaxed text-amber-100/80">
          Map imagery, account login, and workspace persistence are prototype features, not evidence of an operational command system. Do not use this application for emergency decisions or dispatch.
        </p>
      </div>
    </AppShell>
  );
}
