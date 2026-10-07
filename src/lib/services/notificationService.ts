/**
 * ISIE - Integrated Situation Intelligence Engine
 * Tactical Notification Service
 */

import { NotificationItem } from "../types/isie";
import { DEMO_NOTIFICATIONS } from "@/data/demo/notifications";
import { collection, doc, getDocs, updateDoc, query, deleteDoc } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "@/lib/firebase/client";

export interface INotificationService {
  getNotifications(isDemoMode?: boolean): Promise<NotificationItem[]>;
  markAsRead(notificationId: string, isDemoMode?: boolean): Promise<boolean>;
  clearAll(isDemoMode?: boolean): Promise<boolean>;
}

export class NotificationService implements INotificationService {
  private demoNotifications: NotificationItem[] = [...DEMO_NOTIFICATIONS];

  async getNotifications(isDemoMode: boolean = false): Promise<NotificationItem[]> {
    if (isDemoMode) {
      return [...this.demoNotifications];
    }
    if (!auth.currentUser) return [];

    try {
      const col = collection(db, "notifications");
      const snapshot = await getDocs(query(col));
      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<NotificationItem, "id">),
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "notifications");
      return [];
    }
  }

  async markAsRead(notificationId: string, isDemoMode: boolean = false): Promise<boolean> {
    if (isDemoMode) {
      this.demoNotifications = this.demoNotifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      return true;
    }
    if (!auth.currentUser) return false;

    try {
      const docRef = doc(db, "notifications", notificationId);
      await updateDoc(docRef, { read: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${notificationId}`);
      return false;
    }
  }

  async clearAll(isDemoMode: boolean = false): Promise<boolean> {
    if (isDemoMode) {
      this.demoNotifications = [];
      return true;
    }
    if (!auth.currentUser) return false;

    try {
      const snapshot = await getDocs(query(collection(db, "notifications")));
      await Promise.all(snapshot.docs.map((notification) => deleteDoc(notification.ref)));
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "notifications");
      return false;
    }
  }
}

export const notificationService = new NotificationService();
