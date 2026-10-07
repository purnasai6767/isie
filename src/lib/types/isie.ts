/**
 * ISIE - Integrated Situation Intelligence Engine
 * Comprehensive Domain Types & Contracts
 * 
 * Strict Frontend-Only Typing for Future Backend / Sensor Integration
 */

export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "MODERATE" | "LOW" | "INFORMATIONAL";

export type HazardZoneClassification = "RED_ZONE" | "WARNING_ZONE" | "SAFE_ZONE";

export type CarryingCapacityStatus = "SAFE" | "WARNING" | "CRITICAL";

export type VerificationStatus = "UNVERIFIED" | "AWAITING_VERIFICATION" | "VERIFIED_BY_AUTHORITY";

export type EventStatus =
  | "DRAFT"
  | "REPORTED"
  | "VERIFIED"
  | "ACTIVE"
  | "MONITORING"
  | "CONTAINED"
  | "RESOLVED"
  | "ARCHIVED"
  | "EMERGING";

export type EventCategory = 
  | "HYDROMETEOROLOGICAL"
  | "GEOPHYSICAL"
  | "STRUCTURAL_INFRASTRUCTURE"
  | "RELOCATION_DISPLACEMENT"
  | "BORDER_STRATEGIC"
  | "ECOLOGICAL"
  | "NATURAL_HAZARD"
  | "SECURITY_HUMAN"
  | "HEALTH_BIOLOGICAL";

export type IncidentSpecificType =
  // Natural Hazard
  | "Flood"
  | "Flash Flood"
  | "Cyclone"
  | "Earthquake"
  | "Landslide"
  | "Wildfire"
  | "Drought"
  | "Extreme Weather"
  | "GLOF"
  // Security / Human-Caused
  | "Security Incident"
  | "Infrastructure Failure"
  | "Industrial Incident"
  | "Cyber Incident"
  // Health / Biological
  | "Public Health Event"
  | "Epidemic / Outbreak";

export interface GeoCoordinates {
  lat: number;
  lng: number;
  elevationMeters?: number;
}

export interface HazardRedZone {
  id: string;
  zoneCode: string;
  name: string;
  classification: HazardZoneClassification;
  hazardType: "FLOOD" | "LANDSLIDE" | "CYCLONE" | "EXTREME_RAINFALL" | "DAM_BREACH";
  district: string;
  state: string;
  coordinates: GeoCoordinates;
  boundaryPolygon?: GeoCoordinates[];
  populationExposed: number;
  carryingCapacityStatus: CarryingCapacityStatus;
  relocationPriorityScore: number; // 0 - 100
  lastAssessmentTimestamp: string;
  sourceAgencies: string[];
}

export interface CarryingCapacityMetrics {
  zoneId: string;
  populationExposure: {
    totalHabitationPopulation: number;
    vulnerablePopulation: number; // elderly, children
    currentShelterCapacity: number;
    capacityDeficitPercentage: number;
  };
  infrastructureIntegrity: {
    criticalRoadsOperational: number; // percentage
    bridgesAtRiskCount: number;
    substationRiskStatus: CarryingCapacityStatus;
    telecomTowersOperational: number; // percentage
  };
  healthcareAvailability: {
    districtHospitalBedOccupancy: number; // percentage
    mobileMedicalUnitsActive: number;
    criticalMedicineSupplyDays: number;
  };
  resourceReserves: {
    potableWaterHoursRemaining: number;
    emergencyRationPacks: number;
  };
  overallStatus: CarryingCapacityStatus;
}

export interface RelocationIntelligence {
  zoneId: string;
  zoneName: string;
  priorityRank: number;
  relocationPriorityScore: number;
  evacuationRoutesIdentified: {
    routeId: string;
    corridorName: string;
    status: "OPEN" | "IMPEDED" | "SEVERED" | "UNKNOWN";
    clearanceBottlenecks: string[];
  }[];
  designatedShelters: {
    shelterId: string;
    name: string;
    maxCapacity: number;
    currentLoad: number;
    distanceKm: number;
  }[];
  estimatedTransitTimeHours: number;
}

/**
 * Canonical Incident Interface
 * Single-source-of-truth operational incident record supporting full lifecycle
 */
export interface Incident {
  id: string;
  title: string;
  incidentType: IncidentSpecificType | string;
  description?: string;
  summary: string;
  category: EventCategory;
  severity: SeverityLevel;
  status: EventStatus;
  locationName: string;
  country: string;
  state: string;
  district: string;
  region?: string;
  coordinates: GeoCoordinates;
  populationAtRisk: number;
  affectedAreaKm2?: number;
  affectedHabitationsCount?: number;
  infrastructureImpact?: string;
  criticalFacilitiesAffected?: number;
  source: string;
  sourceAgencies?: string[];
  confidence: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
  confidenceScore?: number;
  detectionTime: string;
  timestamp?: string;
  additionalNotes?: string;
  hazardZoneLevel?: HazardZoneClassification;
  carryingCapacityStatus?: CarryingCapacityStatus;
  relocationScore?: number;
  escalationRisk?: "EXTREME" | "ELEVATED" | "STABLE" | "SUBSIDING";
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  eventCode?: string;
  sourceCount?: number;
  verificationStatus?: VerificationStatus;
  evidenceIds?: string[];
  auditLog?: Array<{
    timestamp: string;
    action: string;
    performedBy: string;
    details?: string;
  }>;
}

export interface IntelligenceEvent extends Partial<Incident> {
  id: string;
  eventCode: string;
  title: string;
  category: EventCategory;
  severity: SeverityLevel;
  status: EventStatus;
  timestamp: string;
  locationName: string;
  region: string;
  coordinates: GeoCoordinates;
  confidenceScore: number; // 0 - 1.0
  sourceCount: number;
  sourceAgencies: string[];
  verificationStatus: VerificationStatus;
  summary: string;
  description?: string;
  affectedHabitationsCount: number;
  populationAtRisk: number;
  hazardZoneLevel?: HazardZoneClassification;
  carryingCapacityStatus?: CarryingCapacityStatus;
  relocationScore?: number;
  escalationRisk: "ELEVATED" | "STABLE" | "SUBSIDING" | "EXTREME";
  evidenceIds: string[];
  // Extended Operational Incident Schema
  incidentType?: IncidentSpecificType | string;
  country?: string;
  state?: string;
  district?: string;
  affectedAreaKm2?: number;
  infrastructureImpact?: string;
  criticalFacilitiesAffected?: number;
  detectionTime?: string;
  additionalNotes?: string;
  source?: string;
  confidence?: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  auditLog?: Array<{
    timestamp: string;
    action: string;
    performedBy: string;
    details?: string;
  }>;
}

export type OperationalIncident = Incident;

export interface EvidenceItem {
  id: string;
  title: string;
  sourceName: "IMD Mausam" | "CWC Hydrology" | "ISRO / NRSC NDEM" | "Copernicus Sentinel" | "NASA FIRMS" | "OpenStreetMap" | "Field Command Telemetry";
  sourceType: "SATELLITE_SAR" | "SATELLITE_OPTICAL" | "RADAR_WEATHER" | "RIVER_GAUGE" | "THERMAL_ANOMALY" | "OFFICIAL_ADVISORY" | "TELEMETRY_SENSOR";
  timestamp: string;
  coordinates?: GeoCoordinates;
  verificationStatus: VerificationStatus;
  confidenceScore: number;
  authoritativeUrl?: string;
  technicalMetadata: {
    sensor?: string;
    resolution?: string;
    revisitInterval?: string;
    dataLatencyMinutes?: number;
    qcChecksum?: string;
  };
  summary: string;
  relatedEventIds: string[];
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  category: EventCategory;
  severity: SeverityLevel;
  phase: "HISTORICAL_BASELINE" | "EARLY_TRIGGER" | "RAPID_CASCADE" | "CURRENT_OBSERVATION" | "PROJECTED_WINDOW";
  summary: string;
  coordinates?: GeoCoordinates;
  relatedZoneId?: string;
}

export interface ScenarioParameter {
  id: string;
  key: string;
  name: string;
  category: "METEOROLOGICAL" | "HYDROLOGICAL" | "INFRASTRUCTURE" | "CAPACITY";
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  currentValue: number;
  description: string;
}

export interface SimulationResult {
  scenarioId: string;
  scenarioName: string;
  computedAt: string;
  hazardZoneShift: {
    additionalRedZoneSqKm: number;
    newlyVulnerableHabitations: number;
  };
  carryingCapacityBreach: {
    shelterExhaustionHours: number;
    waterReserveExhaustionHours: number;
    severedRoutesCount: number;
  };
  relocationLoadDeltaPercentage: number;
  confidenceInterval: {
    minRisk: number;
    maxRisk: number;
  };
}

export interface Scenario {
  id: string;
  name: string;
  targetRegion: string;
  description: string;
  horizonHours: 12 | 24 | 48 | 72;
  parameters: ScenarioParameter[];
  status: "DRAFT" | "READY" | "RUNNING" | "COMPLETED" | "ENGINE_UNAVAILABLE";
  results?: SimulationResult;
}

export interface Alert {
  id: string;
  alertCode: string;
  title: string;
  severity: SeverityLevel;
  alertType: "HAZARD_SURGE" | "CAPACITY_BREACH" | "ROUTE_SEVERED" | "EARLY_WARNING" | "SYSTEM_DIAGNOSTIC";
  location: string;
  timestamp: string;
  sourceAgency: string;
  confidenceScore: number;
  status: "ACTIVE" | "ACKNOWLEDGED" | "MUTED" | "DISMISSED";
  relatedEventId?: string;
  recommendedAction?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: "CRITICAL_ALERT" | "INTEL_UPDATE" | "SYSTEM" | "SCENARIO";
  timestamp: string;
  read: boolean;
  priority: "HIGH" | "NORMAL" | "LOW";
  actionUrl?: string;
}

export interface MapLayerConfig {
  id: string;
  name: string;
  category: "HAZARD_ZONES" | "SATELLITE" | "HYDROLOGICAL" | "INFRASTRUCTURE" | "POPULATION";
  description: string;
  enabled: boolean;
  opacity: number;
  sourceProvider: string;
  latencySpec: string;
}

export interface OperatingScope {
  id: string;
  code: string;
  name: string;
  sector: "NATIONAL_STRATEGIC" | "NORTHERN_SECTOR" | "HIMALAYAN_BELT" | "COASTAL_ZONES" | "PENINSULAR_BASIN";
  activeWatch: boolean;
  zoneCount: number;
}

export interface UserProfile {
  id: string;
  email?: string;
  callsign: string;
  name: string;
  displayName?: string;
  role: string;
  organization: string;
  clearanceLevel: "STRATEGIC_COMMAND_L4" | "OPERATIONAL_DIRECTOR_L3" | "SECTOR_ANALYST_L2" | string;
  clearance?: string;
  dutyStation: string;
  defaultScope: string;
  telemetryStreamMode: "SECURE_STANDBY" | "LIVE_PULL";
  sessionStartTime: string;
  avatarUrl?: string;
  photoURL?: string;
  provider?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  preferences?: {
    defaultMapMode?: string;
    theme?: string;
    reducedMotion?: boolean;
    highContrast?: boolean;
  };
}

export interface SystemStatusState {
  status: "FRONTEND_PREVIEW" | "STANDBY" | "CONNECTING" | "LIMITED" | "ONLINE" | "OFFLINE";
  telemetryConnected: boolean;
  simulationEngineConnected: boolean;
  activeSensorsCount: number;
  dataSourcesConfigured: number;
  lastHeartbeat: string;
  apiGatewayLatencyMs: number | null;
  activeScope: OperatingScope;
}
