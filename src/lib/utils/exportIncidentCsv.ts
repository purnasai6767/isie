import { IntelligenceEvent } from "@/lib/types/isie";

export interface ExportCsvOptions {
  officerName?: string;
  officerRole?: string;
  organization?: string;
  callsign?: string;
}

/**
 * Escapes a single CSV value following RFC 4180 rules.
 */
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Generates and downloads an operational CSV dataset for an incident event.
 * Formatted with standard RFC 4180 headers and cells, compatible with GIS software,
 * Microsoft Excel, Google Sheets, Python/Pandas, and relational databases.
 */
export function exportIncidentDataCsv(
  incident: IntelligenceEvent,
  options?: ExportCsvOptions
): boolean {
  try {
    const exportTimeUtc = new Date().toISOString();

    const headers = [
      "Event Code",
      "Incident ID",
      "Title",
      "Category",
      "Incident Type",
      "Severity Level",
      "Operational Status",
      "Escalation Risk",
      "Hazard Zone Classification",
      "Carrying Capacity Status",
      "Relocation Priority Score",
      "Population At Risk",
      "Affected Area Km2",
      "Affected Habitations Count",
      "Critical Facilities Affected",
      "Infrastructure Impact",
      "Country",
      "State",
      "District",
      "Location Name",
      "Latitude",
      "Longitude",
      "Elevation Meters",
      "Detection Timestamp",
      "Created At",
      "Updated At",
      "Logged By",
      "Primary Source",
      "Source Agencies",
      "Source Count",
      "Confidence Level",
      "Confidence Score",
      "Verification Status",
      "Situation Assessment Summary",
      "Description and Tactical Notes",
      "Evidence Reference IDs",
      "Audit Log History",
      "Exporting Officer",
      "Officer Role",
      "Officer Callsign",
      "Organization",
      "Export Timestamp UTC",
    ];

    const sourceAgenciesJoined = Array.isArray(incident.sourceAgencies) && incident.sourceAgencies.length > 0
      ? incident.sourceAgencies.join("; ")
      : incident.source || "Not provided";

    const evidenceIdsJoined = Array.isArray(incident.evidenceIds) && incident.evidenceIds.length > 0
      ? incident.evidenceIds.join("; ")
      : "";

    const auditHistoryJoined = Array.isArray(incident.auditLog) && incident.auditLog.length > 0
      ? incident.auditLog
          .map((a) => `[${a.timestamp}] ${a.action} (${a.performedBy}${a.details ? `: ${a.details}` : ""})`)
          .join("; ")
      : "";

    const values = [
      incident.eventCode || incident.id,
      incident.id,
      incident.title,
      incident.category,
      incident.incidentType,
      incident.severity,
      incident.status,
      incident.escalationRisk || "UNSPECIFIED",
      incident.hazardZoneLevel || "RED_ZONE",
      incident.carryingCapacityStatus || "CRITICAL",
      incident.relocationScore !== undefined ? incident.relocationScore : "N/A",
      incident.populationAtRisk,
      incident.affectedAreaKm2 !== undefined ? incident.affectedAreaKm2 : "N/A",
      incident.affectedHabitationsCount !== undefined ? incident.affectedHabitationsCount : "N/A",
      incident.criticalFacilitiesAffected !== undefined ? incident.criticalFacilitiesAffected : "N/A",
      incident.infrastructureImpact || "Corridors compromised",
      incident.country || "India",
      incident.state || "N/A",
      incident.district || "N/A",
      incident.locationName,
      incident.coordinates?.lat ?? "N/A",
      incident.coordinates?.lng ?? "N/A",
      incident.coordinates?.elevationMeters ?? "N/A",
      incident.detectionTime || incident.timestamp || "N/A",
      incident.createdAt || "N/A",
      incident.updatedAt || "N/A",
      incident.createdByName || incident.createdBy || "Not provided",
      incident.source || "Not provided",
      sourceAgenciesJoined,
      incident.sourceCount || (Array.isArray(incident.sourceAgencies) ? incident.sourceAgencies.length : 1),
      incident.confidence || "Not provided",
      incident.confidenceScore !== undefined ? incident.confidenceScore : "N/A",
      incident.verificationStatus || "UNVERIFIED",
      incident.summary || "",
      incident.description || incident.additionalNotes || "",
      evidenceIdsJoined,
      auditHistoryJoined,
      options?.officerName || "Workspace Operator",
      options?.officerRole || "Not provided",
      options?.callsign || "Not provided",
      options?.organization || "National Disaster Management Authority",
      exportTimeUtc,
    ];

    const headerLine = headers.map(escapeCsvCell).join(",");
    const valueLine = values.map(escapeCsvCell).join(",");
    const csvContent = `${headerLine}\r\n${valueLine}\r\n`;

    // Add UTF-8 Byte Order Mark (BOM) so Excel and spreadsheet viewers recognize UTF-8 characters cleanly
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const sanitizedRef = (incident.eventCode || incident.id).replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `ISIE_Incident_Data_${sanitizedRef}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("Failed to generate incident CSV export:", error);
    return false;
  }
}
