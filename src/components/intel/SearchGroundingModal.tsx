"use client";

import React, { useState } from "react";
import {
  Globe,
  Search,
  ExternalLink,
  Sparkles,
  X,
  Check,
  BookmarkPlus,
  Loader2,
  AlertCircle,
  TrendingUp,
  FileText,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { TacticalBadge } from "../ui/TacticalBadge";
import { TacticalButton } from "../ui/TacticalButton";
import { useAuth } from "@/lib/auth/AuthContext";
import { addTacticalLog } from "@/lib/firebase/client";

interface SearchGroundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultQuery?: string;
}

interface GroundingChunkWeb {
  web?: {
    uri?: string;
    title?: string;
  };
}

export const SearchGroundingModal: React.FC<SearchGroundingModalProps> = ({
  isOpen,
  onClose,
  defaultQuery = "Latest IMD cyclone warning and coastal weather advisories for Bay of Bengal and Odisha",
}) => {
  const { user } = useAuth();
  const [query, setQuery] = useState(defaultQuery);
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunkWeb[]>([]);
  const [webSearchQueries, setWebSearchQueries] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResultText(null);
    setGroundingChunks([]);
    setWebSearchQueries([]);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/search-grounding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to query Google Search Grounding.");
      }

      setResultText(data.text);
      setGroundingChunks(data.groundingChunks || []);
      setWebSearchQueries(data.webSearchQueries || []);
    } catch (err: any) {
      console.error("Search Grounding client error:", err);
      setError(err?.message || "An unexpected error occurred during Search Grounding.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToFirestore = async () => {
    if (!user || !resultText) return;
    try {
      const logId = await addTacticalLog(user.id, {
        title: `Google Search Intel: ${query.slice(0, 48)}...`,
        content: resultText,
        source: "FIELD_NOTE",
        sector: "National Intelligence Sector",
      });
      if (logId) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save tactical log:", err);
    }
  };

  const PRESET_QUERIES = [
    {
      label: "IMD CYCLONE BULLETIN",
      query: "Latest IMD cyclone bulletin and coastal weather alert Bay of Bengal and Odisha",
    },
    {
      label: "CWC FLOOD WARNINGS",
      query: "Central Water Commission (CWC) latest flood advisory Brahmaputra & Ganga basins",
    },
    {
      label: "HIMALAYAN GLOF & ROADS",
      query: "Uttarakhand Chamoli landslide road blockade and GLOF river alert status today",
    },
    {
      label: "NDMA DISASTER DEPLOYMENT",
      query: "National Disaster Response Force (NDRF) deployment advisories in India recent",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-isie-panel/95 border border-white/20 rounded-sm shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-isie-panel-light/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xs bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Globe className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                  Live Google Search Grounding
                </h3>
                <TacticalBadge variant="orange" size="sm">
                  GEMINI 3.5 FLASH
                </TacticalBadge>
              </div>
              <p className="text-[11px] font-mono text-isie-text-muted mt-0.5">
                Up-to-date real-time web verification powered by Google Search Tool
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-isie-text-muted hover:text-white rounded-xs hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Preset Buttons */}
          <div>
            <div className="text-[10px] font-mono text-isie-text-dim uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-amber-400" />
              <span>Real-Time Situational Search Presets:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_QUERIES.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(p.query);
                  }}
                  className="px-2 py-1 text-[10px] font-mono bg-white/5 hover:bg-amber-950/40 border border-white/10 hover:border-amber-500/40 text-slate-300 hover:text-amber-200 rounded-xs transition-colors shrink-0"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-3">
            <div>
              <label className="block text-[11px] font-mono text-isie-text-secondary uppercase tracking-wider mb-1">
                Real-Time Search Query:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Current flood gauge levels in Brahmaputra at Dibrugarh..."
                  className="w-full bg-[#05070e] border border-white/20 focus:border-amber-400 p-2.5 pl-9 font-mono text-xs text-white rounded-xs outline-none transition-colors"
                />
                <Search className="w-4 h-4 text-isie-text-muted absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-mono text-slate-400">
                Grounding with Google Search ensures zero hallucination for current events.
              </span>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-black font-mono text-xs font-bold rounded-xs transition-colors shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>GROUNDING SEARCH...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>GROUND SEARCH INTEL</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-xs flex items-center gap-2 text-xs font-mono text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Area */}
          {resultText && (
            <div className="space-y-4 pt-2 border-t border-white/10 animate-in fade-in duration-200">
              {/* Google Search Queries Executed */}
              {webSearchQueries.length > 0 && (
                <div className="p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-xs font-mono text-xs">
                  <div className="text-[10px] text-amber-300 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-amber-400" />
                    <span>Google Search Grounding Queries Executed:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {webSearchQueries.map((sq, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 bg-black/40 border border-amber-500/20 text-[10px] text-slate-300 rounded-xs"
                      >
                        &ldquo;{sq}&rdquo;
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Synthesized Grounded Response */}
              <div className="bg-[#05070e] border border-white/15 p-4 rounded-xs font-mono text-xs leading-relaxed space-y-2 text-slate-200">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                      Grounded Intelligence Synthesis
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-xs">
                    SEARCH RESULTS · REVIEW SOURCE
                  </span>
                </div>
                <div className="whitespace-pre-line text-[11.5px] leading-relaxed select-text">
                  {resultText}
                </div>
              </div>

              {/* Grounded Web Sources / Citations */}
              {groundingChunks.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    <span>Real-Time Web Citations & Evidence ({groundingChunks.length}):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {groundingChunks.map((chunk, idx) => {
                      const item = chunk.web;
                      if (!item || !item.uri) return null;
                      const hostname = item.uri ? new URL(item.uri).hostname : "web";
                      return (
                        <a
                          key={idx}
                          href={item.uri}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="p-2.5 bg-white/[0.03] hover:bg-amber-950/20 border border-white/10 hover:border-amber-500/40 rounded-xs transition-colors flex flex-col justify-between group"
                        >
                          <div className="font-mono text-[11px] font-bold text-slate-200 group-hover:text-amber-300 line-clamp-2">
                            {item.title || item.uri}
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-isie-text-muted">
                            <span className="text-amber-400/90 font-semibold truncate max-w-[200px]">
                              {hostname}
                            </span>
                            <span className="text-amber-400 flex items-center gap-0.5 group-hover:underline">
                              <span>VIEW SOURCE</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Save To Firestore Action */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-[10px] font-mono text-isie-text-dim">
                  {user ? `Logged in as ${user.email}` : "Sign in to save this log to Firestore database."}
                </span>
                {user && (
                  <button
                    onClick={handleSaveToFirestore}
                    disabled={savedSuccess}
                    className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-semibold rounded-xs transition-colors ${
                      savedSuccess
                        ? "bg-emerald-900/60 text-emerald-300 border border-emerald-500/50"
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                    }`}
                  >
                    {savedSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>SAVED TO TACTICAL LOGS</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>SAVE TO FIRESTORE LOGS</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-white/10 bg-isie-panel-light/30 flex items-center justify-between font-mono text-[10px] text-isie-text-dim shrink-0">
          <span>MODEL: GEMINI-3.5-FLASH // TOOL: GOOGLE SEARCH</span>
          <button
            onClick={onClose}
            className="px-3 py-1 text-slate-300 hover:text-white hover:bg-white/5 rounded-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchGroundingModal;
