/**
 * ISIE - Integrated Situation Intelligence Engine
 * Timeline & Event Evolution Service
 */

import { TimelineEvent } from "../types/isie";
import { DEMO_TIMELINE_EVENTS } from "@/data/demo/timelines";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "@/lib/firebase/client";

export interface ITimelineService {
  getTimelineEvents(zoneId?: string, isDemoMode?: boolean): Promise<TimelineEvent[]>;
}

export class TimelineService implements ITimelineService {
  async getTimelineEvents(zoneId?: string, isDemoMode: boolean = false): Promise<TimelineEvent[]> {
    if (isDemoMode) {
      if (!zoneId || zoneId === "ALL") {
        return [...DEMO_TIMELINE_EVENTS];
      }
      return DEMO_TIMELINE_EVENTS.filter((e) => e.relatedZoneId === zoneId);
    }
    if (!auth.currentUser) return [];

    try {
      const col = collection(db, "timelines");
      const q = zoneId && zoneId !== "ALL"
        ? query(col, where("relatedZoneId", "==", zoneId))
        : query(col);

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TimelineEvent, "id">),
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "timelines");
      return [];
    }
  }
}

export const timelineService = new TimelineService();
