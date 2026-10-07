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
    id: "RES-NDRF-01",
    name: "8th Battalion NDRF (Swift Water Rescue)",
    category: "DISASTER_BATTALION",
    location: "Joshimath Forward Staging Base",
    sector: "Himalayan Belt",
    totalCapacity: 180, // Personnel
    currentAllocated: 140,
    status: "DEPLOYED",
    contactCallsign: "EAGLE-RES-1",
    readinessPercentage: 95,
    lastUpdated: "15 mins ago",
  },
  {
    id: "RES-NDRF-02",
    name: "3rd Battalion NDRF (Coastal Evacuation Team)",
    category: "DISASTER_BATTALION",
    location: "Puri Coastal Command",
    sector: "Coastal Corridor",
    totalCapacity: 240,
    currentAllocated: 80,
    status: "EN_ROUTE",
    contactCallsign: "CYCLONE-COMMAND",
    readinessPercentage: 90,
    lastUpdated: "40 mins ago",
  },
  {
    id: "RES-SHL-01",
    name: "Pipalkoti Central Community Shelter Haven",
    category: "RELIEF_SHELTER",
    location: "Pipalkoti Safe Zone, Chamoli",
    sector: "Himalayan Belt",
    totalCapacity: 4500, // Persons
    currentAllocated: 3700,
    status: "STANDBY",
    contactCallsign: "HAVEN-ALPHA",
    readinessPercentage: 82,
    lastUpdated: "25 mins ago",
  },
  {
    id: "RES-SHL-02",
    name: "Majuli High Ground Emergency Enclosure",
    category: "RELIEF_SHELTER",
    location: "Kamalabari, Majuli",
    sector: "Northern Sector",
    totalCapacity: 8000,
    currentAllocated: 5120,
    status: "DEPLOYED",
    contactCallsign: "HAVEN-MAJULI",
    readinessPercentage: 64,
    lastUpdated: "1 hr ago",
  },
  {
    id: "RES-MED-01",
    name: "Mobile Trauma & Field Surgical Unit 4",
    category: "HEALTHCARE_UNIT",
    location: "Karnaprayag District Link",
    sector: "Himalayan Belt",
    totalCapacity: 120, // Emergency beds
    currentAllocated: 88,
    status: "DEPLOYED",
    contactCallsign: "MEDIC-CORPS-4",
    readinessPercentage: 73,
    lastUpdated: "30 mins ago",
  },
  {
    id: "RES-WTR-01",
    name: "Emergency Potable Desalination & Tanker Fleet",
    category: "WATER_LOGISTICS",
    location: "Ganjam District Hub",
    sector: "Coastal Corridor",
    totalCapacity: 250000, // Litres/day
    currentAllocated: 180000,
    status: "DEPLOYED",
    contactCallsign: "AQUA-SUPPLY",
    readinessPercentage: 88,
    lastUpdated: "45 mins ago",
  },
];
