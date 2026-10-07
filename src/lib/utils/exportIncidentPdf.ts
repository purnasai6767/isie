import { jsPDF } from "jspdf";
import { IntelligenceEvent } from "@/lib/types/isie";

export interface ExportPdfOptions {
  officerName?: string;
  officerRole?: string;
  organization?: string;
  callsign?: string;
}

/**
 * Generates and downloads a workspace PDF summary for an incident report.
 */
export function exportIncidentReportPdf(
  incident: IntelligenceEvent,
  options?: ExportPdfOptions
): boolean {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = 14;

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 16) {
        doc.addPage();
        y = 16;
        drawPageBorder();
      }
    };

    const drawPageBorder = () => {
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.3);
      doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
    };

    drawPageBorder();

    // 1. TOP CLASSIFICATION STRIP
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(8, 8, pageWidth - 16, 9, "F");

    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(248, 113, 113); // red-400
    doc.text("WORKSPACE INCIDENT REPORT // UNVERIFIED", margin, 14);

    const dateStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
    doc.setFont("courier", "normal");
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(dateStr, pageWidth - margin, 14, { align: "right" });

    y = 24;

    // 2. HEADER BANNER
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("INTEGRATED SITUATION INTELLIGENCE ENGINE (ISIE)", margin, y);

    y += 5.5;
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.setTextColor(234, 88, 12); // orange-600
    doc.text("USER-SUBMITTED INCIDENT SUMMARY", margin, y);

    y += 2;
    doc.setDrawColor(234, 88, 12);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + contentWidth, y);

    y += 6;

    // 3. INCIDENT TITLE & METADATA BAR
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentWidth, 22, 1.5, 1.5, "FD");

    // Event Code & Severity Badge
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`INCIDENT REF: ${incident.eventCode || incident.id}`, margin + 4, y + 6);

    // Severity Pill
    const isCrit = incident.severity === "CRITICAL";
    const isHigh = incident.severity === "HIGH";
    if (isCrit) {
      doc.setFillColor(239, 68, 68); // red-500
      doc.setTextColor(255, 255, 255);
    } else if (isHigh) {
      doc.setFillColor(249, 115, 22); // orange-500
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(14, 165, 233); // sky-500
      doc.setTextColor(255, 255, 255);
    }
    doc.roundedRect(margin + contentWidth - 44, y + 2.5, 40, 5.5, 1, 1, "F");
    doc.setFont("courier", "bold");
    doc.setFontSize(8.5);
    doc.text(
      `SEV: ${incident.severity}`,
      margin + contentWidth - 24,
      y + 6.3,
      { align: "center" }
    );

    // Incident Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    const titleLines = doc.splitTextToSize(incident.title.toUpperCase(), contentWidth - 8);
    doc.text(titleLines[0], margin + 4, y + 13);

    // Location & Status
    doc.setFont("courier", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const statusText = `STATUS: ${incident.status || "ACTIVE"}  |  CATEGORY: ${incident.category}  |  TIME: ${incident.timestamp}`;
    doc.text(statusText, margin + 4, y + 18.5);

    y += 27;

    // 4. KEY TACTICAL METRICS TILES (4 Columns)
    const tileW = (contentWidth - 9) / 4;
    const tileH = 15;

    const metrics = [
      {
        label: "POPULATION AT RISK",
        value: incident.populationAtRisk === undefined
          ? "NOT PROVIDED"
          : `${Number(incident.populationAtRisk).toLocaleString()} (user-entered; unverified)`,
        color: [220, 38, 38], // red-600
      },
      {
        label: "RELOCATION INDEX",
        value: `${incident.relocationScore || 75} / 100`,
        color: [234, 88, 12], // orange-600
      },
      {
        label: "CARRYING CAPACITY",
        value: incident.carryingCapacityStatus || "CRITICAL",
        color: [180, 83, 9], // amber-700
      },
      {
        label: "EXPOSED HABITATIONS",
        value: incident.affectedHabitationsCount === undefined
          ? "NOT PROVIDED"
          : `${incident.affectedHabitationsCount} (user-entered; unverified)`,
        color: [15, 23, 42], // slate-900
      },
    ];

    metrics.forEach((m, idx) => {
      const tx = margin + idx * (tileW + 3);
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(tx, y, tileW, tileH, 1, 1, "FD");

      doc.setFont("courier", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(m.label, tx + tileW / 2, y + 4.5, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(m.color[0], m.color[1], m.color[2]);
      doc.text(m.value, tx + tileW / 2, y + 11.5, { align: "center" });
    });

    y += tileH + 6;

    // 5. SITUATIONAL SUMMARY & ASSESSMENT
    checkPageBreak(35);
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 5.5, "F");
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("1.0 SITUATIONAL EVOLUTION & OPERATIONAL ASSESSMENT", margin + 3, y + 3.8);
    y += 7.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59); // slate-800
    const summaryText = incident.summary || "No extended situational assessment provided for this event.";
    const splitSummary = doc.splitTextToSize(summaryText, contentWidth - 4);
    doc.text(splitSummary, margin + 2, y);
    y += splitSummary.length * 4.2 + 4;

    // 6. GEOGRAPHIC & INFRASTRUCTURE DOSSIER
    checkPageBreak(45);
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 5.5, "F");
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("2.0 GEOSPATIAL COORDINATES & INFRASTRUCTURE CONTEXT", margin + 3, y + 3.8);
    y += 7.5;

    const geoRows = [
      ["Operational Target", incident.locationName],
      ["District / Sector", `${incident.district || "Sector Alpha"}, ${incident.state || "National Division"}`],
      ["Coordinates (WGS-84)", `${incident.coordinates.lat.toFixed(5)}°N, ${incident.coordinates.lng.toFixed(5)}°E`],
      ["Elevation Datum", incident.coordinates.elevationMeters ? `${incident.coordinates.elevationMeters} meters ASL` : "Calculated from SRTM 30m DEM"],
      ["Surface Area Affected", incident.affectedAreaKm2 ? `${incident.affectedAreaKm2} km²` : "Sector perimeter active"],
      ["Infrastructure Criticality", incident.infrastructureImpact || "Access corridors and river bridges monitored for severance"],
      ["Critical Facilities Hit", incident.criticalFacilitiesAffected ? `${incident.criticalFacilitiesAffected} vital installations reported` : "Nil direct infrastructure strikes verified"],
    ];

    doc.setFontSize(8);
    geoRows.forEach(([label, val], idx) => {
      const rowY = y + idx * 5.2;
      checkPageBreak(8);

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, rowY - 3.8, contentWidth, 5.2, "F");
      }

      doc.setFont("courier", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text(label.toUpperCase(), margin + 3, rowY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      const safeVal = doc.splitTextToSize(val, contentWidth - 65);
      doc.text(safeVal[0], margin + 62, rowY);
    });

    y += geoRows.length * 5.2 + 5;

    // 7. User-submitted source notes and verification state
    checkPageBreak(35);
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 5.5, "F");
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("3.0 SOURCE NOTES & VERIFICATION STATE", margin + 3, y + 3.8);
    y += 7.5;

    const sources = incident.sourceAgencies && incident.sourceAgencies.length > 0
      ? incident.sourceAgencies.join(", ")
      : incident.source || "NOT PROVIDED";

    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("SOURCE NOTES:", margin + 3, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(sources, margin + 48, y);
    y += 5.5;

    doc.setFont("courier", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("VERIFICATION LEVEL:", margin + 3, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(16, 149, 193);
    doc.text(incident.verificationStatus || "UNVERIFIED", margin + 48, y);
    y += 5.5;

    doc.setFont("courier", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("CONFIDENCE SCORE:", margin + 3, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(22, 101, 52); // green-800
    doc.text(
      typeof incident.confidenceScore === "number"
        ? `${(incident.confidenceScore * 100).toFixed(0)}% (workspace value; unverified)`
        : "NOT PROVIDED",
      margin + 48,
      y
    );
    y += 8;

    // 8. Workspace record attribution
    checkPageBreak(32);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 20, 1, 1, "FD");

    const officer = options?.officerName || incident.createdByName || "Not provided";
    const role = options?.officerRole || "Not provided";
    const org = options?.organization || "Not provided";
    const callsign = options?.callsign || "Not provided";

    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("RECORDED BY:", margin + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(`${officer} [${callsign}]`, margin + 36, y + 5);

    doc.setFont("courier", "bold");
    doc.text("AUTHORITY / UNIT:", margin + 4, y + 10);
    doc.setFont("helvetica", "normal");
    doc.text(`${role} // ${org}`, margin + 36, y + 10);

    doc.setFont("courier", "bold");
    doc.text("RECORD ID:", margin + 4, y + 15);
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(incident.id || "NOT PROVIDED", margin + 36, y + 15);

    y += 24;

    // 9. FOOTER ON EVERY PAGE
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        "ISIE CRISIS MANAGEMENT PLATFORM — OFFICIAL SITUATION SUMMARY — CONFIDENTIAL DISPATCH",
        margin,
        pageHeight - 11
      );
      doc.text(`PAGE ${p} OF ${totalPages}`, pageWidth - margin, pageHeight - 11, { align: "right" });
    }

    const filename = `ISIE_Incident_Report_${(incident.eventCode || incident.id).replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
    doc.save(filename);
    return true;
  } catch (error) {
    console.error("Failed to generate incident PDF report:", error);
    return false;
  }
}
