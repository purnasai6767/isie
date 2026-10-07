import { ResponseResource, DEMO_RESOURCES } from "@/data/demo/resources";
import { addDoc, collection, doc, getDocs, getDoc, query, where } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "@/lib/firebase/client";

export interface IResourceService {
  getResources(category?: string, isDemoMode?: boolean): Promise<ResponseResource[]>;
  getResourceById(id: string, isDemoMode?: boolean): Promise<ResponseResource | null>;
  createResource(input: Omit<ResponseResource, "id" | "lastUpdated">): Promise<string>;
}

function parseResource(id: string, value: Record<string, unknown>): ResponseResource | null {
  const validCategories: ResponseResource["category"][] = [
    "DISASTER_BATTALION",
    "RELIEF_SHELTER",
    "HEALTHCARE_UNIT",
    "WATER_LOGISTICS",
    "ENGINEERING",
  ];
  const validStatuses: ResponseResource["status"][] = [
    "DEPLOYED",
    "STANDBY",
    "EN_ROUTE",
    "SATURATED",
  ];
  const readiness = value.readinessPercentage;
  const valid =
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    typeof value.category === "string" &&
    validCategories.includes(value.category as ResponseResource["category"]) &&
    typeof value.location === "string" &&
    value.location.trim().length > 0 &&
    typeof value.sector === "string" &&
    typeof value.totalCapacity === "number" &&
    Number.isFinite(value.totalCapacity) &&
    value.totalCapacity > 0 &&
    typeof value.currentAllocated === "number" &&
    Number.isFinite(value.currentAllocated) &&
    value.currentAllocated >= 0 &&
    value.currentAllocated <= value.totalCapacity &&
    typeof value.status === "string" &&
    validStatuses.includes(value.status as ResponseResource["status"]) &&
    typeof value.contactCallsign === "string" &&
    typeof value.lastUpdated === "string" &&
    (readiness === undefined ||
      (typeof readiness === "number" && Number.isFinite(readiness) && readiness >= 0 && readiness <= 100));

  if (!valid) {
    console.warn(`Resource ${id} has invalid fields and was omitted from the workspace view.`);
    return null;
  }

  return { id, ...(value as Omit<ResponseResource, "id">) };
}

export class ResourceService implements IResourceService {
  async createResource(input: Omit<ResponseResource, "id" | "lastUpdated">): Promise<string> {
    if (!auth.currentUser) throw new Error("Sign in before creating a workspace resource.");
    if (
      !input.name.trim() ||
      !input.location.trim() ||
      !input.sector.trim() ||
      !input.contactCallsign.trim() ||
      !Number.isFinite(input.totalCapacity) ||
      input.totalCapacity <= 0 ||
      !Number.isFinite(input.currentAllocated) ||
      input.currentAllocated < 0 ||
      input.currentAllocated > input.totalCapacity
    ) {
      throw new Error("Provide a name, location, sector, contact, and valid capacity values.");
    }

    try {
      const reference = await addDoc(collection(db, "resources"), {
        ...input,
        name: input.name.trim(),
        location: input.location.trim(),
        sector: input.sector.trim(),
        contactCallsign: input.contactCallsign.trim(),
        lastUpdated: new Date().toISOString(),
        createdBy: auth.currentUser.uid,
        recordType: "USER_ENTERED_WORKSPACE",
      });
      return reference.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "resources");
      throw error;
    }
  }

  async getResources(category?: string, isDemoMode = false): Promise<ResponseResource[]> {
    if (isDemoMode) {
      if (!category || category === "ALL") return [...DEMO_RESOURCES];
      return DEMO_RESOURCES.filter((resource) => resource.category === category);
    }
    if (!auth.currentUser) return [];

    try {
      const resources = collection(db, "resources");
      const snapshot =
        category && category !== "ALL"
          ? await getDocs(query(resources, where("category", "==", category)))
          : await getDocs(query(resources));
      return snapshot.docs
        .map((resource) => parseResource(resource.id, resource.data()))
        .filter((resource): resource is ResponseResource => resource !== null);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "resources");
      throw error;
    }
  }

  async getResourceById(id: string, isDemoMode = false): Promise<ResponseResource | null> {
    if (isDemoMode) return DEMO_RESOURCES.find((resource) => resource.id === id) || null;
    if (!auth.currentUser) return null;

    try {
      const snapshot = await getDoc(doc(db, "resources", id));
      return snapshot.exists() ? parseResource(snapshot.id, snapshot.data()) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `resources/${id}`);
      throw error;
    }
  }
}

export const resourceService = new ResourceService();
