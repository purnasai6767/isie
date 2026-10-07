/**
 * ISIE - Integrated Situation Intelligence Engine
 * Canonical Operational Incident Service
 * 
 * Manages operational crisis incidents, multi-module cascades, and real-time Firestore synchronization.
 * Strictly separates Demo Mode (synthetic in-memory data) from Real Authenticated User operational data.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "@/lib/firebase/client";
import { IntelligenceEvent, Alert, TimelineEvent } from "@/lib/types/isie";
import { DEMO_INCIDENTS } from "@/data/demo/incidents";
import { AuthUser } from "@/lib/auth/AuthContext";
import { hasPermission } from "@/lib/auth/roles";

export interface CreateIncidentInput {
  title: string;
  incidentType?: string;
  category: IntelligenceEvent["category"];
  severity: IntelligenceEvent["severity"];
  status?: IntelligenceEvent["status"];
  summary: string;
  locationName: string;
  country?: string;
  affectedState?: string;
  affectedDistrict?: string;
  region?: string;
  coordinates: { lat: number; lng: number; elevationMeters?: number };
  populationAtRisk: number;
  affectedAreaKm2?: number;
  infrastructureImpact?: string;
  criticalFacilitiesAffected?: number;
  source: string;
  sourceAgencies?: string[];
  confidence?: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
  confidenceScore?: number;
  detectionTime?: string;
  additionalNotes?: string;
  relocationScore?: number;
  hazardZoneLevel?: IntelligenceEvent["hazardZoneLevel"];
  carryingCapacityStatus?: IntelligenceEvent["carryingCapacityStatus"];
  escalationRisk?: IntelligenceEvent["escalationRisk"];
}

function toIntelligenceEvent(id: string, data: Record<string, unknown>): IntelligenceEvent | null {
  const requiredStrings = [
    "eventCode",
    "title",
    "category",
    "severity",
    "status",
    "timestamp",
    "locationName",
    "region",
    "verificationStatus",
    "summary",
    "escalationRisk",
  ];
  const requiredNumbers = [
    "confidenceScore",
    "sourceCount",
    "affectedHabitationsCount",
    "populationAtRisk",
  ];
  const coordinates = data.coordinates as { lat?: unknown; lng?: unknown } | undefined;
  const hasCompleteCoordinates =
    typeof coordinates?.lat === "number" &&
    Number.isFinite(coordinates.lat) &&
    coordinates.lat >= -90 &&
    coordinates.lat <= 90 &&
    typeof coordinates.lng === "number" &&
    Number.isFinite(coordinates.lng) &&
    coordinates.lng >= -180 &&
    coordinates.lng <= 180;

  if (
    !requiredStrings.every((key) => typeof data[key] === "string" && data[key]) ||
    !requiredNumbers.every((key) => typeof data[key] === "number" && Number.isFinite(data[key])) ||
    !hasCompleteCoordinates ||
    !Array.isArray(data.sourceAgencies) ||
    !data.sourceAgencies.every((agency) => typeof agency === "string") ||
    !Array.isArray(data.evidenceIds) ||
    !data.evidenceIds.every((evidenceId) => typeof evidenceId === "string")
  ) {
    console.warn(`Incident ${id} is missing required fields and was excluded from workspace views.`);
    return null;
  }

  return { id, ...(data as Omit<IntelligenceEvent, "id">) };
}

export class IncidentService {
  /**
   * Fetch active incidents.
   * If isDemoMode is true, strictly returns static synthetic incidents.
   * If isDemoMode is false, queries authenticated workspace Firestore records.
   */
  async getIncidents(isDemoMode: boolean = false): Promise<IntelligenceEvent[]> {
    if (isDemoMode) {
      return [...DEMO_INCIDENTS];
    }
    if (!auth.currentUser) return [];

    try {
      const incidentsCol = collection(db, "incidents");
      const q = query(incidentsCol);
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return [];
      }

      return snapshot.docs
        .map((docSnap) => toIntelligenceEvent(docSnap.id, docSnap.data()))
        .filter((incident): incident is IntelligenceEvent => incident !== null);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "incidents");
      return [];
    }
  }

  /**
   * Fetch single incident by ID
   */
  async getIncidentById(id: string, isDemoMode: boolean = false): Promise<IntelligenceEvent | null> {
    if (isDemoMode) {
      return DEMO_INCIDENTS.find((i) => i.id === id) || null;
    }
    if (!auth.currentUser) return null;

    try {
      const docRef = doc(db, "incidents", id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return toIntelligenceEvent(docSnap.id, docSnap.data());
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `incidents/${id}`);
      return null;
    }
  }

  /**
   * Subscribe to real-time incident changes
   */
  subscribeIncidents(
    arg1: boolean | ((incidents: IntelligenceEvent[]) => void),
    arg2?: boolean | ((incidents: IntelligenceEvent[]) => void),
    onError?: (err: Error) => void
  ): () => void {
    const callback = typeof arg1 === "function" ? arg1 : (typeof arg2 === "function" ? arg2 : () => {});
    const isDemoMode = typeof arg1 === "boolean" ? arg1 : (typeof arg2 === "boolean" ? arg2 : false);

    if (isDemoMode) {
      callback([...DEMO_INCIDENTS]);
      return () => {};
    }
    if (!auth.currentUser) {
      callback([]);
      return () => {};
    }

    try {
      const incidentsCol = collection(db, "incidents");
      const unsubscribe = onSnapshot(
        incidentsCol,
        (snapshot) => {
          const firestoreList = snapshot.docs
            .map((docSnap) => toIntelligenceEvent(docSnap.id, docSnap.data()))
            .filter((incident): incident is IntelligenceEvent => incident !== null);
          callback(firestoreList);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, "incidents");
          onError?.(error);
          callback([]);
        }
      );
      return unsubscribe;
    } catch (err: any) {
      handleFirestoreError(err, OperationType.LIST, "incidents");
      callback([]);
      return () => {};
    }
  }

  subscribeToIncidents = this.subscribeIncidents;

  /**
   * Create an unverified, user-submitted incident report in Firestore.
   */
  async createIncident(
    input: CreateIncidentInput,
    creator: AuthUser
  ): Promise<{ success: boolean; incidentId?: string; error?: string }> {
    // RBAC validation
    if (!creator) {
      return { success: false, error: "Authentication required to create incident." };
    }

    if (!hasPermission(creator.role, "canCreateIncident")) {
      return { success: false, error: `Unauthorized: User role '${creator.role}' lacks permission to create operational incidents.` };
    }

    // Strict Data Validation (Reject malformed coordinates or incomplete records)
    if (!input.title || input.title.trim().length < 3) {
      return { success: false, error: "Validation Error: Incident title must be at least 3 characters." };
    }

    const lat = Number(input.coordinates?.lat);
    const lng = Number(input.coordinates?.lng);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return { success: false, error: "Validation Error: Latitude must be a valid number between -90 and 90 degrees." };
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return { success: false, error: "Validation Error: Longitude must be a valid number between -180 and 180 degrees." };
    }
    if (!Number.isInteger(input.populationAtRisk) || input.populationAtRisk < 0) {
      return { success: false, error: "Validation Error: Population at risk must be a non-negative whole number." };
    }
    if (
      input.affectedAreaKm2 !== undefined &&
      (!Number.isFinite(input.affectedAreaKm2) || input.affectedAreaKm2 < 0)
    ) {
      return { success: false, error: "Validation Error: Affected area must be a non-negative number." };
    }
    if (
      input.criticalFacilitiesAffected !== undefined &&
      (!Number.isInteger(input.criticalFacilitiesAffected) || input.criticalFacilitiesAffected < 0)
    ) {
      return { success: false, error: "Validation Error: Critical facilities must be a non-negative whole number." };
    }

    if (!input.locationName || input.locationName.trim().length < 2) {
      return { success: false, error: "Validation Error: Location name is required." };
    }

    if (!input.source || input.source.trim().length < 2) {
      return { success: false, error: "Validation Error: A source note or reference is required." };
    }

    try {
      const now = new Date().toISOString();
      const codeSuffix = Math.floor(1000 + Math.random() * 9000);
      const incidentId = `INC-${new Date().getFullYear()}-${codeSuffix}`;
      const eventCode = `EVT-${(input.category || "HYD").slice(0, 3)}-${codeSuffix}`;

      const stateName = input.affectedState?.trim();
      const districtName = input.affectedDistrict?.trim();
      const regionName = input.region?.trim() || input.locationName.trim();

      const incidentData: Omit<IntelligenceEvent, "id"> & {
        createdBy: string;
        createdByName: string;
        createdAt: string;
        updatedBy: string;
        updatedAt: string;
      } = {
        eventCode,
        title: input.title.trim(),
        incidentType: input.incidentType,
        category: input.category,
        severity: input.severity,
        status: "REPORTED",
        timestamp: now,
        locationName: input.locationName.trim(),
        country: input.country?.trim(),
        state: stateName,
        district: districtName,
        region: regionName,
        coordinates: {
          lat,
          lng,
          elevationMeters: input.coordinates.elevationMeters,
        },
        confidence: input.confidence,
        confidenceScore: input.confidenceScore ?? 0,
        source: input.source.trim(),
        sourceCount: input.sourceAgencies?.length ?? 0,
        sourceAgencies: input.sourceAgencies ?? [],
        verificationStatus: "AWAITING_VERIFICATION",
        detectionTime: input.detectionTime,
        summary: input.summary ? input.summary.trim() : `Operational situation registered for ${input.locationName}.`,
        additionalNotes: input.additionalNotes?.trim() || "",
        affectedHabitationsCount: 0,
        populationAtRisk: Number(input.populationAtRisk),
        affectedAreaKm2: input.affectedAreaKm2,
        infrastructureImpact: input.infrastructureImpact?.trim() || "",
        criticalFacilitiesAffected: input.criticalFacilitiesAffected,
        hazardZoneLevel: input.hazardZoneLevel,
        carryingCapacityStatus: input.carryingCapacityStatus,
        relocationScore: input.relocationScore,
        escalationRisk: input.escalationRisk || "STABLE",
        evidenceIds: [],
        createdBy: creator.id,
        createdByName: creator.name,
        createdAt: now,
        updatedBy: creator.id,
        updatedAt: now,
        auditLog: [
          {
            timestamp: now,
            action: "INITIAL_REGISTRATION",
            performedBy: `${creator.name} (${creator.role})`,
            details: "User-submitted report awaiting authoritative verification.",
          },
        ],
      };

      // 1. Store core incident in Firestore (ONE Canonical Record)
      await setDoc(doc(db, "incidents", incidentId), incidentData);

      // Keep report history without generating unverified alerts, zones, or dispatch advice.
      const timelineId = `TL-${incidentId.replace("INC-", "")}`;
      const timelineData: TimelineEvent = {
        id: timelineId,
        timestamp: now,
        title: input.title,
        category: input.category,
        severity: input.severity,
        phase: "EARLY_TRIGGER",
        summary: `User-submitted report. Severity and impact have not been independently verified. Source supplied: ${input.source}.`,
        coordinates: incidentData.coordinates,
        relatedZoneId: incidentId,
      };
      await setDoc(doc(db, "timelines", timelineId), timelineData);

      return { success: true, incidentId };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, "incidents");
      return { success: false, error: err?.message || "Failed to save the workspace report to Firestore." };
    }
  }

  /**
   * Update incident fields in Firestore with audit tracking
   */
  async updateIncident(id: string, updates: Partial<IntelligenceEvent>, actor?: AuthUser): Promise<boolean> {
    if (
      updates.verificationStatus !== undefined ||
      updates.status === "VERIFIED"
    ) {
      console.warn("Incident verification must be performed through an authorized review workflow.");
      return false;
    }

    try {
      const docRef = doc(db, "incidents", id);
      const now = new Date().toISOString();
      const snap = await getDoc(docRef);
      const existingAudit = snap.exists() ? (snap.data()?.auditLog || []) : [];

      const newAuditEntry = {
        timestamp: now,
        action: "RECORD_MODIFIED",
        performedBy: actor ? `${actor.name} (${actor.role})` : "System Operator",
        details: `Updated fields: ${Object.keys(updates).join(", ")}`,
      };

      await updateDoc(docRef, {
        ...updates,
        updatedBy: actor?.id || "operator",
        updatedAt: now,
        auditLog: [...existingAudit, newAuditEntry],
      });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `incidents/${id}`);
      return false;
    }
  }

  /**
   * Update incident status with audit tracking and timeline event creation
   */
  async updateIncidentStatus(
    id: string,
    newStatus: IntelligenceEvent["status"],
    notes: string,
    actor: AuthUser
  ): Promise<{ success: boolean; error?: string }> {
    if (newStatus === "VERIFIED") {
      return { success: false, error: "Incident verification requires an authorized review workflow." };
    }
    try {
      const docRef = doc(db, "incidents", id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        return { success: false, error: "Incident document not found." };
      }

      const currentData = snap.data();
      const previousStatus = currentData.status;
      const now = new Date().toISOString();
      const existingAudit = currentData.auditLog || [];

      const auditEntry = {
        timestamp: now,
        action: `STATUS_CHANGED_${newStatus}`,
        performedBy: `${actor.name} (${actor.role})`,
        details: `Status transitioned from ${previousStatus} to ${newStatus}. Notes: ${notes || "No additional commentary"}`,
      };

      await updateDoc(docRef, {
        status: newStatus,
        updatedBy: actor.id,
        updatedAt: now,
        auditLog: [...existingAudit, auditEntry],
      });

      // Add timeline event for status change
      const timelineId = `TL-${id.replace("INC-", "")}-${Date.now().toString().slice(-4)}`;
      const timelineData: TimelineEvent = {
        id: timelineId,
        timestamp: `${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} UTC`,
        title: `Status: ${previousStatus} → ${newStatus}`,
        category: currentData.category || "HYDROMETEOROLOGICAL",
        severity: currentData.severity || "MEDIUM",
        phase: newStatus === "RESOLVED" || newStatus === "CONTAINED" ? "PROJECTED_WINDOW" : "CURRENT_OBSERVATION",
        summary: `Status updated by ${actor.name}. ${notes || "Operational posture adjusted."}`,
        coordinates: currentData.coordinates,
        relatedZoneId: id,
      };
      await setDoc(doc(db, "timelines", timelineId), timelineData);

      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `incidents/${id}`);
      return { success: false, error: err?.message || "Failed to update incident status." };
    }
  }
}

export const incidentService = new IncidentService();
