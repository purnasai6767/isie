/**
 * ISIE - Integrated Situation Intelligence Engine
 * Risk & Carrying Capacity Service
 */

import { CarryingCapacityMetrics, HazardRedZone, RelocationIntelligence } from "../types/isie";
import { DEMO_RED_ZONES, DEMO_CARRYING_CAPACITY, DEMO_RELOCATION_PRIORITIES } from "@/data/demo/riskScores";
import { collection, doc, getDocs, getDoc, query } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "@/lib/firebase/client";

export interface IRiskService {
  getHazardRedZones(scopeId?: string, isDemoMode?: boolean): Promise<HazardRedZone[]>;
  getCarryingCapacityAssessment(zoneId?: string, isDemoMode?: boolean): Promise<CarryingCapacityMetrics | null>;
  getRelocationPriorities(scopeId?: string, isDemoMode?: boolean): Promise<RelocationIntelligence[]>;
}

export class RiskService implements IRiskService {
  async getHazardRedZones(_scopeId?: string, isDemoMode: boolean = false): Promise<HazardRedZone[]> {
    if (isDemoMode) {
      return [...DEMO_RED_ZONES];
    }
    if (!auth.currentUser) return [];

    try {
      const col = collection(db, "hazard_zones");
      const snapshot = await getDocs(query(col));
      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<HazardRedZone, "id">),
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "hazard_zones");
      throw err;
    }
  }

  async getCarryingCapacityAssessment(zoneId?: string, isDemoMode: boolean = false): Promise<CarryingCapacityMetrics | null> {
    if (isDemoMode) {
      return DEMO_CARRYING_CAPACITY;
    }
    if (!auth.currentUser) return null;

    try {
      if (zoneId) {
        const docRef = doc(db, "carrying_capacity", zoneId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return { zoneId: snap.id, ...(snap.data() as Omit<CarryingCapacityMetrics, "zoneId">) };
        }
      }

      // If no zoneId provided, fetch first available
      const col = collection(db, "carrying_capacity");
      const snapshot = await getDocs(query(col));
      if (snapshot.empty) {
        return null;
      }
      const first = snapshot.docs[0];
      return { zoneId: first.id, ...(first.data() as Omit<CarryingCapacityMetrics, "zoneId">) };
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `carrying_capacity/${zoneId || "all"}`);
      throw err;
    }
  }

  async getRelocationPriorities(_scopeId?: string, isDemoMode: boolean = false): Promise<RelocationIntelligence[]> {
    if (isDemoMode) {
      return [...DEMO_RELOCATION_PRIORITIES];
    }
    if (!auth.currentUser) return [];

    try {
      const col = collection(db, "relocation_plans");
      const snapshot = await getDocs(query(col));
      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs.map((d) => ({
        zoneId: d.id,
        ...(d.data() as Omit<RelocationIntelligence, "zoneId">),
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "relocation_plans");
      throw err;
    }
  }
}

export const riskService = new RiskService();
