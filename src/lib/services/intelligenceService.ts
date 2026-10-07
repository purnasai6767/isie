/**
 * ISIE - Integrated Situation Intelligence Engine
 * Intelligence & Crisis Telemetry Service
 */

import { EvidenceItem, IntelligenceEvent, VerificationStatus } from "../types/isie";
import { DEMO_INCIDENTS } from "@/data/demo/incidents";
import { DEMO_EVIDENCE } from "@/data/demo/intelligence";
import { incidentService } from "./incidentService";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase/client";

export interface IIntelligenceService {
  getActiveEvents(scopeOrDemo?: string | boolean, isDemoMode?: boolean): Promise<IntelligenceEvent[]>;
  getEventById(id: string, isDemoMode?: boolean): Promise<IntelligenceEvent | null>;
  getEvidenceForEvent(eventId: string, isDemoMode?: boolean): Promise<EvidenceItem[]>;
  getAllAuthoritativeEvidence(isDemoMode?: boolean): Promise<EvidenceItem[]>;
  verifyEvidence(evidenceId: string): Promise<{ success: boolean; status: VerificationStatus }>;
}

export class IntelligenceService implements IIntelligenceService {
  /**
   * Fetch active crisis events.
   * Seamlessly routes to Firestore in Real User Mode or DEMO_INCIDENTS in Demo Mode.
   */
  async getActiveEvents(scopeOrDemo?: string | boolean, isDemoMode?: boolean): Promise<IntelligenceEvent[]> {
    const isDemo = typeof scopeOrDemo === "boolean" ? scopeOrDemo : (isDemoMode ?? false);
    return incidentService.getIncidents(isDemo);
  }

  async getEventById(id: string, isDemoMode: boolean = false): Promise<IntelligenceEvent | null> {
    return incidentService.getIncidentById(id, isDemoMode);
  }

  async getEvidenceForEvent(eventId: string, isDemoMode: boolean = false): Promise<EvidenceItem[]> {
    const all = await this.getAllAuthoritativeEvidence(isDemoMode);
    return all.filter((e) => e.relatedEventIds.includes(eventId));
  }

  async getAllAuthoritativeEvidence(isDemoMode: boolean = false): Promise<EvidenceItem[]> {
    if (isDemoMode) {
      return [...DEMO_EVIDENCE];
    }

    try {
      const evidenceCol = collection(db, "evidence");
      const snapshot = await getDocs(query(evidenceCol));
      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<EvidenceItem, "id">),
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "evidence");
      return [];
    }
  }

  async verifyEvidence(evidenceId: string): Promise<{ success: boolean; status: VerificationStatus }> {
    console.warn(`Evidence verification requires an authorized review workflow: ${evidenceId}`);
    return {
      success: false,
      status: "AWAITING_VERIFICATION",
    };
  }
}

export const intelligenceService = new IntelligenceService();
