"use client";

import React, { useState } from "react";
import {
  Flame,
  X,
  MapPin,
  AlertTriangle,
  Users,
  ShieldCheck,
  Radio,
  Clock,
  Building,
  Layers,
  CheckCircle2,
  AlertCircle,
  Compass,
} from "lucide-react";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { useAuth } from "@/lib/auth/AuthContext";
import { hasPermission } from "@/lib/auth/roles";
import { incidentService, CreateIncidentInput } from "@/lib/services/incidentService";
import {
  SeverityLevel,
  EventStatus,
  EventCategory,
  IncidentSpecificType,
} from "@/lib/types/isie";

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (incidentId: string) => void;
}

const INCIDENT_TAXONOMY: {
  category: EventCategory;
  categoryLabel: string;
  types: IncidentSpecificType[];
}[] = [
  {
    category: "NATURAL_HAZARD",
    categoryLabel: "NATURAL HAZARDS",
    types: [
      "Flood",
      "Flash Flood",
      "Cyclone",
      "Earthquake",
      "Landslide",
      "Wildfire",
      "Drought",
      "Extreme Weather",
      "GLOF",
    ],
  },
  {
    category: "SECURITY_HUMAN",
    categoryLabel: "SECURITY / HUMAN-CAUSED",
    types: [
      "Security Incident",
      "Infrastructure Failure",
      "Industrial Incident",
      "Cyber Incident",
    ],
  },
  {
    category: "HEALTH_BIOLOGICAL",
    categoryLabel: "HEALTH / BIOLOGICAL",
    types: [
      "Public Health Event",
      "Epidemic / Outbreak",
    ],
  },
];

const LOCATION_PRESETS = [
  {
    name: "Chamoli, Uttarakhand",
    state: "Uttarakhand",
    district: "Chamoli",
    lat: 30.3165,
    lng: 79.5461,
  },
  {
    name: "Joshimath, Uttarakhand",
    state: "Uttarakhand",
    district: "Chamoli",
    lat: 30.5564,
    lng: 79.5633,
  },
  {
    name: "Wayanad, Kerala",
    state: "Kerala",
    district: "Wayanad",
    lat: 11.6854,
    lng: 76.132,
  },
  {
    name: "Puri Coastal, Odisha",
    state: "Odisha",
    district: "Puri",
    lat: 19.8135,
    lng: 85.8312,
  },
  {
    name: "Dibrugarh, Assam",
    state: "Assam",
    district: "Dibrugarh",
    lat: 27.4728,
    lng: 94.912,
  },
];

export function CreateIncidentModal({
  isOpen,
  onClose,
  onCreated,
}: CreateIncidentModalProps) {
  const { user, isDemoMode } = useAuth();

  // Form State
  const [title, setTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>("NATURAL_HAZARD");
  const [selectedType, setSelectedType] = useState<IncidentSpecificType>("Flood");
  const [severity, setSeverity] = useState<SeverityLevel>("INFORMATIONAL");
  const [status, setStatus] = useState<EventStatus>("REPORTED");
  const [description, setDescription] = useState("");

  // Location State
  const [country, setCountry] = useState("");
  const [stateName, setStateName] = useState("");
  const [district, setDistrict] = useState("");
  const [locationName, setLocationName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  // Impact State
  const [populationAtRisk, setPopulationAtRisk] = useState("");
  const [affectedAreaKm2, setAffectedAreaKm2] = useState("");
  const [infrastructureImpact, setInfrastructureImpact] = useState("");
  const [criticalFacilities, setCriticalFacilities] = useState("");

  // Intelligence State
  const [source, setSource] = useState("");
  const [confidence, setConfidence] = useState<"LOW" | "MODERATE" | "HIGH" | "VERY_HIGH">("LOW");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  if (!isOpen) return null;

  const canCreate = !!user && hasPermission(user.role, "canCreateIncident");

  const handleApplyPreset = (preset: typeof LOCATION_PRESETS[0]) => {
    setCountry("India");
    setStateName(preset.state);
    setDistrict(preset.district);
    setLocationName(`${preset.district}, ${preset.state}, India`);
    setLatitude(preset.lat.toString());
    setLongitude(preset.lng.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSuccessId(null);

    // Coordinate validation
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setError("Latitude must be between -90 and 90.");
      return;
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setError("Longitude must be between -180 and 180.");
      return;
    }

    if (!title.trim() || title.length < 3) {
      setError("Please provide a descriptive incident title (min 3 characters).");
      return;
    }

    if (!source.trim()) {
      setError("Enter a source note or reference. It will remain unverified.");
      return;
    }
    const populationNum = Number(populationAtRisk);
    if (!Number.isInteger(populationNum) || populationNum < 0) {
      setError("Population at risk must be a non-negative whole number.");
      return;
    }
    const areaNum = affectedAreaKm2.trim() ? Number(affectedAreaKm2) : undefined;
    if (areaNum !== undefined && (!Number.isFinite(areaNum) || areaNum < 0)) {
      setError("Affected area must be a non-negative number.");
      return;
    }
    const facilitiesNum = criticalFacilities.trim() ? Number(criticalFacilities) : undefined;
    if (facilitiesNum !== undefined && (!Number.isInteger(facilitiesNum) || facilitiesNum < 0)) {
      setError("Critical facilities must be a non-negative whole number.");
      return;
    }
    if (!country.trim()) {
      setError("Country is required.");
      return;
    }

    setLoading(true);

    try {
      const input: CreateIncidentInput = {
        title: title.trim(),
        incidentType: selectedType,
        category: selectedCategory,
        severity,
        status,
        summary: description.trim() || `User-submitted ${selectedType} report for ${locationName.trim()}; awaiting independent verification.`,
        locationName: locationName.trim(),
        country: country.trim(),
        affectedState: stateName.trim(),
        affectedDistrict: district.trim(),
        region: [district.trim(), stateName.trim()].filter(Boolean).join(", ") || locationName.trim(),
        coordinates: {
          lat: latNum,
          lng: lngNum,
        },
        populationAtRisk: populationNum,
        affectedAreaKm2: areaNum,
        infrastructureImpact: infrastructureImpact.trim(),
        criticalFacilitiesAffected: facilitiesNum,
        source: source.trim(),
        confidence,
        additionalNotes: additionalNotes.trim(),
      };

      const result = await incidentService.createIncident(input, user);

      if (!result.success || !result.incidentId) {
        throw new Error(result.error || "Failed to create incident record.");
      }

      setSuccessId(result.incidentId);
      if (onCreated) {
        onCreated(result.incidentId);
      }

      // Close modal after brief confirmation
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err?.message || "Failed to initialize operational incident.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-4xl bg-isie-panel border border-white/20 rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-isie-panel-light/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xs bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  OPERATIONAL DISPATCH // CREATE INCIDENT
                </span>
                <TacticalBadge variant="critical" size="sm">
                  ONE CANONICAL SOURCE
                </TacticalBadge>
              </div>
              <p className="text-[10px] text-isie-text-muted font-mono">
                Saves a workspace report; it does not verify hazards or trigger operational alerts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xs text-isie-text-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
          {/* Permission / Mode Warning */}
          {!canCreate ? (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-mono font-bold text-red-300 uppercase">
                  Insufficient Operational Clearance
                </div>
                <div className="text-isie-text-dim text-[11px] mt-0.5">
                  Your current role (<strong>{user?.role || "VIEWER"}</strong>) does not have authorization to initialize operational incidents. Contact your Sector Command Administrator.
                </div>
              </div>
            </div>
          ) : isDemoMode ? (
            <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-sm flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-mono font-bold text-cyan-300 uppercase">
                  Operational Incident Creation Ready
                </div>
                <div className="text-isie-text-dim text-[11px] mt-0.5">
                  Your role (<strong>{user?.role}</strong>) permits incident creation. Committing will persist to the centralized Firestore cluster and propagate downstream to 2D Map, 3D Globe, Risk, Alerts, and Timeline.
                </div>
              </div>
            </div>
          ) : null}

          {/* Success Banner */}
          {successId && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-xs font-mono">
                <span className="font-bold text-emerald-300">
                  INCIDENT {successId} COMMITTED TO FIRESTORE
                </span>
                <span className="block text-[11px] text-emerald-200/80">
                  Operational cascades generated: Alerts, Hazard Red Zone, Timeline milestone, and Command Notification.
                </span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <div className="text-xs font-mono text-red-200">{error}</div>
            </div>
          )}

          <form id="create-incident-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Basic Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-white/10">
                <Flame className="w-4 h-4 text-isie-primary" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  1. Basic Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted">
                    Incident Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Chamoli Flash Flood // Rishi Ganga Sector"
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white placeholder-isie-text-dim outline-none focus:border-isie-primary/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted">
                    Taxonomy Category *
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      const cat = e.target.value as EventCategory;
                      setSelectedCategory(cat);
                      const tax = INCIDENT_TAXONOMY.find((t) => t.category === cat);
                      if (tax && tax.types.length > 0) {
                        setSelectedType(tax.types[0]);
                      }
                    }}
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white outline-none focus:border-isie-primary/60"
                  >
                    {INCIDENT_TAXONOMY.map((tax) => (
                      <option key={tax.category} value={tax.category} className="bg-isie-panel">
                        {tax.categoryLabel}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted">
                    Incident Specific Type *
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as IncidentSpecificType)}
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white outline-none focus:border-isie-primary/60"
                  >
                    {INCIDENT_TAXONOMY.find((t) => t.category === selectedCategory)?.types.map(
                      (type) => (
                        <option key={type} value={type} className="bg-isie-panel">
                          {type}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted">
                    Severity Level *
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white outline-none focus:border-isie-primary/60"
                  >
                    <option value="CRITICAL" className="bg-isie-panel text-red-400">
                      CRITICAL (Immediate Threat / Catastrophic Cascade)
                    </option>
                    <option value="HIGH" className="bg-isie-panel text-amber-400">
                      HIGH (Severe Hazard / Active Containment)
                    </option>
                    <option value="MODERATE" className="bg-isie-panel text-yellow-400">
                      MODERATE (Elevated Risk / Watch Condition)
                    </option>
                    <option value="LOW" className="bg-isie-panel text-emerald-400">
                      LOW (Minor Disturbance / Controlled)
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted">
                    Operational Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EventStatus)}
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white outline-none focus:border-isie-primary/60"
                  >
                    <option value="ACTIVE" className="bg-isie-panel">ACTIVE (Immediate Tactical Response)</option>
                    <option value="REPORTED" className="bg-isie-panel">REPORTED (Awaiting Field Corroboration)</option>
                    <option value="MONITORING" className="bg-isie-panel">MONITORING (Observation Mode)</option>
                    <option value="CONTAINED" className="bg-isie-panel">CONTAINED (Spread Arrested)</option>
                    <option value="RESOLVED" className="bg-isie-panel">RESOLVED (De-escalated)</option>
                    <option value="DRAFT" className="bg-isie-panel">DRAFT (Internal Preparation)</option>
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted">
                    Operational Summary & Situation Narrative
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide concise operational context, observed river surges, cloudburst timeline, or structural breaches..."
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs p-2 text-xs font-mono text-white placeholder-isie-text-dim outline-none focus:border-isie-primary/60"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: India-First Geolocation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                    2. Location and Coordinates
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-emerald-400">WORLDWIDE REPORTING</span>
              </div>

              {/* Location Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                <span className="font-mono text-[10px] text-isie-text-dim mr-1">INDIA PLACE PRESETS:</span>
                {LOCATION_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2 py-0.5 bg-isie-panel-light/50 border border-white/10 hover:border-emerald-500/50 hover:text-emerald-300 text-[10px] font-mono text-isie-text-muted rounded-xs transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted">
                    Country *
                  </label>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white outline-none focus:border-emerald-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted">
                    State / Province
                  </label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white outline-none focus:border-emerald-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted">
                    City / District
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white outline-none focus:border-emerald-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted">
                    Location Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white outline-none focus:border-emerald-500/60"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted flex items-center justify-between">
                    <span>Latitude (-90° to +90°) *</span>
                    <span className="text-[10px] text-emerald-400 font-mono">LAT</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="e.g., 30.3165"
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white outline-none focus:border-emerald-500/60"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted flex items-center justify-between">
                    <span>Longitude (-180° to +180°) *</span>
                    <span className="text-[10px] text-emerald-400 font-mono">LNG</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="e.g., 79.5461"
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white outline-none focus:border-emerald-500/60"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Impact & Carrying Capacity Assessment */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-white/10">
                <Users className="w-4 h-4 text-amber-400" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  3. Impact Metrics & Critical Facilities
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted">
                    Population at Risk *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={populationAtRisk}
                    onChange={(e) => setPopulationAtRisk(e.target.value)}
                    placeholder="Enter reported estimate"
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white outline-none focus:border-amber-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted">
                    Affected Area (sq km)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={affectedAreaKm2}
                    onChange={(e) => setAffectedAreaKm2(e.target.value)}
                    placeholder="Optional reported value"
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white outline-none focus:border-amber-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted">
                    Critical Facilities Hit
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={criticalFacilities}
                    onChange={(e) => setCriticalFacilities(e.target.value)}
                    placeholder="Optional reported value"
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white outline-none focus:border-amber-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted">
                    Infrastructure Status
                  </label>
                  <input
                    type="text"
                    value={infrastructureImpact}
                    onChange={(e) => setInfrastructureImpact(e.target.value)}
                    placeholder="Road access impeded"
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Intelligence & Corroboration */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-white/10">
                <Radio className="w-4 h-4 text-cyan-400" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  4. Source Note and Operator Assessment
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted">
                    Source Note / Reference *
                  </label>
                  <input
                    type="text"
                    required
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="Who reported this, or a source URL/reference (not independently verified)"
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white outline-none focus:border-cyan-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted">
                    Confidence Tier (operator-entered)
                  </label>
                  <select
                    value={confidence}
                    onChange={(e) =>
                      setConfidence(e.target.value as "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH")
                    }
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white outline-none focus:border-cyan-500/60"
                  >
                    <option value="VERY_HIGH" className="bg-isie-panel">VERY HIGH (operator assessment)</option>
                    <option value="HIGH" className="bg-isie-panel">HIGH (operator assessment)</option>
                    <option value="MODERATE" className="bg-isie-panel">MODERATE (operator assessment)</option>
                    <option value="LOW" className="bg-isie-panel">LOW (operator assessment)</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-3">
                  <label className="font-mono text-[11px] uppercase tracking-wider text-isie-text-muted">
                    Additional Notes (user-provided)
                  </label>
                  <input
                    type="text"
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Optional notes; not an operational instruction"
                    className="w-full bg-isie-panel-light/60 border border-white/10 rounded-xs px-3 py-2 text-xs font-mono text-white outline-none focus:border-cyan-500/60"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-isie-panel-light/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-isie-text-dim">
            <Compass className="w-3.5 h-3.5 text-isie-primary" />
            <span>SAVES TO WORKSPACE WHEN FIRESTORE IS CONNECTED</span>
          </div>

          <div className="flex items-center gap-2">
            <TacticalButton variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              CANCEL
            </TacticalButton>

            <TacticalButton
              variant="primary"
              size="sm"
              type="submit"
              form="create-incident-form"
              disabled={loading || !canCreate}
            >
              {loading ? "COMMITTING TO FIRESTORE..." : "+ COMMIT OPERATIONAL INCIDENT"}
            </TacticalButton>
          </div>
        </div>
      </div>
    </div>
  );
}
