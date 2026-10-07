import { CarryingCapacityMetrics, HazardRedZone, RelocationIntelligence } from "@/lib/types/isie";

export const DEMO_RED_ZONES: HazardRedZone[] = [
  {
    id: "ZONE-HIM-01",
    zoneCode: "HZ-RED-01",
    name: "FICTIONAL TABLETOP: Example Flood Zone",
    classification: "RED_ZONE",
    hazardType: "FLOOD",
    district: "Example District",
    state: "Example State",
    coordinates: { lat: 30.5541, lng: 79.5663 },
    populationExposed: 0,
    carryingCapacityStatus: "CRITICAL",
    relocationPriorityScore: 94,
    lastAssessmentTimestamp: "DEMO FIXTURE · no assessment time",
    sourceAgencies: ["Synthetic exercise fixture · no connected source"],
  },
  {
    id: "ZONE-NOR-02",
    zoneCode: "HZ-WARN-02",
    name: "FICTIONAL TABLETOP: Example River Zone",
    classification: "WARNING_ZONE",
    hazardType: "FLOOD",
    district: "Example District",
    state: "Example State",
    coordinates: { lat: 26.6854, lng: 93.3512 },
    populationExposed: 0,
    carryingCapacityStatus: "WARNING",
    relocationPriorityScore: 78,
    lastAssessmentTimestamp: "DEMO FIXTURE · no assessment time",
    sourceAgencies: ["Synthetic exercise fixture · no connected source"],
  },
  {
    id: "ZONE-CST-03",
    zoneCode: "HZ-RED-03",
    name: "FICTIONAL TABLETOP: Example Coastal Zone",
    classification: "RED_ZONE",
    hazardType: "CYCLONE",
    district: "Example District",
    state: "Example State",
    coordinates: { lat: 19.8135, lng: 85.8312 },
    populationExposed: 0,
    carryingCapacityStatus: "CRITICAL",
    relocationPriorityScore: 89,
    lastAssessmentTimestamp: "DEMO FIXTURE · no assessment time",
    sourceAgencies: ["Synthetic exercise fixture · no connected source"],
  },
];

export const DEMO_CARRYING_CAPACITY: CarryingCapacityMetrics = {
  zoneId: "ZONE-HIM-01",
  populationExposure: {
    totalHabitationPopulation: 0,
    vulnerablePopulation: 0,
    currentShelterCapacity: 0,
    capacityDeficitPercentage: 0,
  },
  infrastructureIntegrity: {
    criticalRoadsOperational: 0,
    bridgesAtRiskCount: 0,
    substationRiskStatus: "SAFE",
    telecomTowersOperational: 0,
  },
  healthcareAvailability: {
    districtHospitalBedOccupancy: 0,
    mobileMedicalUnitsActive: 0,
    criticalMedicineSupplyDays: 0,
  },
  resourceReserves: {
    potableWaterHoursRemaining: 0,
    emergencyRationPacks: 0,
  },
  overallStatus: "SAFE",
};

export const DEMO_RELOCATION_PRIORITIES: RelocationIntelligence[] = [
  {
    zoneId: "ZONE-HIM-01",
    zoneName: "FICTIONAL TABLETOP: Example Flood Zone",
    priorityRank: 1,
    relocationPriorityScore: 0,
    estimatedTransitTimeHours: 0,
    evacuationRoutesIdentified: [
      {
        routeId: "EVAC-R1",
        corridorName: "Example Route A · fictional",
        status: "UNKNOWN",
        clearanceBottlenecks: [],
      },
      {
        routeId: "EVAC-R2",
        corridorName: "Example Route B · fictional",
        status: "UNKNOWN",
        clearanceBottlenecks: [],
      },
    ],
    designatedShelters: [
      {
        shelterId: "SHELTER-P1",
        name: "Example Shelter A · fictional",
        maxCapacity: 0,
        currentLoad: 0,
        distanceKm: 0,
      },
      {
        shelterId: "SHELTER-P2",
        name: "Example Shelter B · fictional",
        maxCapacity: 0,
        currentLoad: 0,
        distanceKm: 0,
      },
    ],
  },
  {
    zoneId: "ZONE-CST-03",
    zoneName: "FICTIONAL TABLETOP: Example Coastal Zone",
    priorityRank: 2,
    relocationPriorityScore: 0,
    estimatedTransitTimeHours: 0,
    evacuationRoutesIdentified: [
      {
        routeId: "EVAC-R3",
        corridorName: "Example Route C · fictional",
        status: "UNKNOWN",
        clearanceBottlenecks: [],
      },
    ],
    designatedShelters: [
      {
        shelterId: "SHELTER-C1",
        name: "Example Shelter C · fictional",
        maxCapacity: 0,
        currentLoad: 0,
        distanceKm: 0,
      },
    ],
  },
];
