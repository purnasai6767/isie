export interface ResponseResource {
  id: string;
  name: string;
  category: "DISASTER_BATTALION" | "RELIEF_SHELTER" | "HEALTHCARE_UNIT" | "WATER_LOGISTICS" | "ENGINEERING";
  location: string;
  sector: string;
  totalCapacity: number;
  currentAllocated: number;
  status: "DEPLOYED" | "STANDBY" | "EN_ROUTE" | "SATURATED";
  contactCallsign: string;
  readinessPercentage?: number;
  lastUpdated: string;
}

export const DEMO_RESOURCES: ResponseResource[] = [
  {
    id: "DEMO-RES-01",
    name: "FICTIONAL TABLETOP: Rescue Team",
    category: "DISASTER_BATTALION",
    location: "Example staging area · fictional",
    sector: "Fictional exercise sector",
    totalCapacity: 180, // Personnel
    currentAllocated: 140,
    status: "DEPLOYED",
    contactCallsign: "DEMO-ONLY",
    readinessPercentage: 95,
    lastUpdated: "DEMO FIXTURE · no update time",
  },
  {
    id: "DEMO-RES-02",
    name: "FICTIONAL TABLETOP: Coastal Response Team",
    category: "DISASTER_BATTALION",
    location: "Example coastal site · fictional",
    sector: "Fictional exercise sector",
    totalCapacity: 240,
    currentAllocated: 80,
    status: "EN_ROUTE",
    contactCallsign: "DEMO-ONLY",
    readinessPercentage: 90,
    lastUpdated: "DEMO FIXTURE · no update time",
  },
  {
    id: "RES-SHL-01",
    name: "FICTIONAL TABLETOP: Community Shelter",
    category: "RELIEF_SHELTER",
    location: "Example shelter location · fictional",
    sector: "Fictional exercise sector",
    totalCapacity: 4500, // Persons
    currentAllocated: 3700,
    status: "STANDBY",
    contactCallsign: "DEMO-ONLY",
    readinessPercentage: 82,
    lastUpdated: "DEMO FIXTURE · no update time",
  },
  {
    id: "RES-SHL-02",
    name: "FICTIONAL TABLETOP: High-Ground Shelter",
    category: "RELIEF_SHELTER",
    location: "Example high ground · fictional",
    sector: "Fictional exercise sector",
    totalCapacity: 8000,
    currentAllocated: 5120,
    status: "DEPLOYED",
    contactCallsign: "DEMO-ONLY",
    readinessPercentage: 64,
    lastUpdated: "DEMO FIXTURE · no update time",
  },
  {
    id: "RES-MED-01",
    name: "FICTIONAL TABLETOP: Mobile Medical Unit",
    category: "HEALTHCARE_UNIT",
    location: "Example field location · fictional",
    sector: "Fictional exercise sector",
    totalCapacity: 120, // Emergency beds
    currentAllocated: 88,
    status: "DEPLOYED",
    contactCallsign: "DEMO-ONLY",
    readinessPercentage: 73,
    lastUpdated: "DEMO FIXTURE · no update time",
  },
  {
    id: "RES-WTR-01",
    name: "FICTIONAL TABLETOP: Water-Logistics Unit",
    category: "WATER_LOGISTICS",
    location: "Example logistics hub · fictional",
    sector: "Fictional exercise sector",
    totalCapacity: 250000, // Litres/day
    currentAllocated: 180000,
    status: "DEPLOYED",
    contactCallsign: "DEMO-ONLY",
    readinessPercentage: 88,
    lastUpdated: "DEMO FIXTURE · no update time",
  },
];
