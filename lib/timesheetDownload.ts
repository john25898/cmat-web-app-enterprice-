import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { TimesheetSubmission } from "@/components/StaffTimesheetDashboard";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Generate and download a PDF for a timesheet submission.
 * Shows signature blocks for every approval level that has been completed.
 */
export function downloadTimesheetPDF(submission: TimesheetSubmission) {
  try {
    const doc = new jsPDF({ format: "a4", unit: "mm" });
    const pageW = 190;
    const margin = 10;
    let y = margin;
    const lineHeight = 7;

    // ── Title ──
    doc.setFontSize(18);
    doc.setTextColor(3, 105, 161);
    doc.text("STAFF TIMESHEET", margin, y + 8);
    y += 10;

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString("en-KE")}`, margin, y + 4);
    y += 10;

    // ── Horizontal line ──
    doc.setDrawColor(3, 105, 161);
    doc.line(margin, y, margin + pageW, y);
    y += 6;

    // ── Staff Info Table ──
    const infoRows: [string, string][] = [
      ["Staff Name", submission.staffFullName || submission.staffName],
      ["Email", submission.staffEmail],
      ["Facility", submission.facility],
    ];
    if (submission.staffCounty)
      infoRows.push(["County", submission.staffCounty]);
    if (submission.staffJobTitle)
      infoRows.push(["Job Title", submission.staffJobTitle]);
    if (submission.staffTelephone)
      infoRows.push(["Telephone", submission.staffTelephone]);
    infoRows.push([
      "Period",
      `${MONTHS[submission.month] ?? "Unknown"} ${submission.year}`,
    ]);
    infoRows.push(["Status", displayStatus(submission.status)]);

    autoTable(doc, {
      startY: y,
      head: [["Field", "Value"]],
      body: infoRows,
      theme: "grid",
      headStyles: {
        fillColor: [3, 105, 161],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: "bold" },
        1: { cellWidth: 150 },
      },
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // ── Daily Entries Table ──
    const dailyEntries = submission.dailyEntries ?? {};
    const dailyKeys = Object.keys(dailyEntries).sort(
      (a, b) => parseInt(a) - parseInt(b),
    );

    if (dailyKeys.length > 0) {
      // Check if we need a page break
      if (y > 240) {
        doc.addPage();
        y = margin;
      }

      doc.setFontSize(12);
      doc.setTextColor(3, 105, 161);
      doc.text("Daily Time Entries", margin, y);
      y += 5;

      // Group by week for readability
      const dayRows: string[][] = [];
      let weekRow: string[] = [];
      dailyKeys.forEach((day, i) => {
        const dayNum = parseInt(day);
        const date = new Date(submission.year, submission.month, dayNum);
        const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
          date.getDay()
        ];
        weekRow.push(`${dayName} ${dayNum}`);
        weekRow.push((dailyEntries[dayNum] || 0).toFixed(1));
        if ((i + 1) % 5 === 0 || i === dailyKeys.length - 1) {
          dayRows.push([...weekRow]);
          weekRow = [];
        }
      });

      const dailyTotal = Object.values(dailyEntries).reduce(
        (s, h) => s + (h || 0),
        0,
      );

      autoTable(doc, {
        startY: y,
        head: [
          [
            "Day",
            "Hours",
            "Day",
            "Hours",
            "Day",
            "Hours",
            "Day",
            "Hours",
            "Day",
            "Hours",
          ],
        ],
        body: dayRows,
        foot: [
          ["Total", dailyTotal.toFixed(1), "", "", "", "", "", "", "", ""],
        ],
        theme: "grid",
        headStyles: {
          fillColor: [100, 116, 139],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 8,
        },
        bodyStyles: { fontSize: 8 },
        footStyles: {
          fillColor: [240, 240, 240],
          fontStyle: "bold",
          fontSize: 8,
        },
        margin: { left: margin, right: margin },
      });

      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Activities Table ──
    const activities = submission.activities ?? [];
    if (activities.length > 0) {
      if (y > 240) {
        doc.addPage();
        y = margin;
      }

      doc.setFontSize(12);
      doc.setTextColor(3, 105, 161);
      doc.text("Activities Breakdown", margin, y);
      y += 5;

      const actRows = activities.map((act) => {
        const actTotal = Object.values(act.timeEntries).reduce(
          (s, h) => s + (h || 0),
          0,
        );
        return [act.project || "—", act.activity || "—", actTotal.toFixed(1)];
      });

      const grandTotal = activities.reduce((sum, act) => {
        return (
          sum + Object.values(act.timeEntries).reduce((s, h) => s + (h || 0), 0)
        );
      }, 0);

      autoTable(doc, {
        startY: y,
        head: [["Project", "Activity", "Total Hours"]],
        body: actRows,
        foot: [["", "GRAND TOTAL", grandTotal.toFixed(1)]],
        theme: "grid",
        headStyles: {
          fillColor: [100, 116, 139],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: { fontSize: 9 },
        footStyles: {
          fillColor: [240, 240, 240],
          fontStyle: "bold",
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 80 },
          2: { cellWidth: 40, halign: "right" },
        },
        margin: { left: margin, right: margin },
      });

      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Confirmation Text ──
    if (y > 255) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.setFont("", "italic");
    const confirmText =
      '"I confirm that the details above are correct, and the work deliverables/output have been met."';
    const splitText = doc.splitTextToSize(confirmText, pageW - 4);
    doc.text(splitText, margin + 2, y + 4);
    y += splitText.length * 4 + 8;
    doc.setFont("", "normal");

    // ── Signature Blocks ──
    const signedLevels: Array<{
      title: string;
      name: string | undefined;
      date: string | undefined;
      sign: string | undefined;
      color: [number, number, number];
      label: string;
    }> = [];

    // Employee signature
    signedLevels.push({
      title: "EMPLOYEE",
      name: submission.staffName,
      date: submission.employeeSignDate || submission.submittedAt,
      sign: submission.employeeSignature || "Submitted",
      color: [79, 70, 229],
      label: "Staff",
    });

    // Facility In-Charge
    if (
      submission.status === "facility_approved" ||
      submission.status === "county_approved" ||
      submission.status === "approved"
    ) {
      signedLevels.push({
        title: "FACILITY IN-CHARGE",
        name: submission.reviewedBy || "—",
        date: submission.reviewedAt,
        sign: submission.reviewedBy || "Approved",
        color: [139, 92, 246],
        label: "Facility In-Charge",
      });
    }

    // County Rep
    if (
      submission.status === "county_approved" ||
      submission.status === "approved"
    ) {
      signedLevels.push({
        title: "COUNTY REP",
        name: submission.countyRepName || "—",
        date: submission.countyRepDate,
        sign: submission.countyRepSign || "Approved",
        color: [13, 148, 136],
        label: "County Rep",
      });
    }

    // Program HR
    if (submission.status === "approved") {
      signedLevels.push({
        title: "PROGRAM HR",
        name: submission.hrName || "—",
        date: submission.hrDate,
        sign: submission.hrSign || "Approved",
        color: [5, 150, 105],
        label: "Program HR",
      });
    }

    // Draw signature blocks
    const sigBlockW = pageW / signedLevels.length - 4;
    const sigBlockH = 45;

    if (y + sigBlockH + 10 > 280) {
      doc.addPage();
      y = margin;
    }

    doc.setDrawColor(200, 200, 200);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    signedLevels.forEach((level, i) => {
      const x = margin + i * (sigBlockW + 4);

      // Box
      doc.setDrawColor(...level.color);
      doc.setLineWidth(0.8);
      doc.rect(x, y, sigBlockW, sigBlockH);

      // Title
      doc.setFont("", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...level.color);
      doc.text(level.title, x + 3, y + 6);

      // Signature line
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(x + 3, y + 17, x + sigBlockW - 3, y + 17);

      // Signed by
      doc.setFont("", "italic");
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      const sigName = level.sign || level.name || "—";
      doc.text(`Signed: ${sigName}`, x + 3, y + 15);

      // Name
      doc.setFont("", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(`Name: ${level.name || "—"}`, x + 3, y + 23);

      // Date
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${formatDate(level.date)}`, x + 3, y + 30);

      // Role label
      doc.setFont("", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...level.color);
      doc.text(level.label, x + 3, y + 37);
    });

    y += sigBlockH + 12;

    // ── Footer ──
    if (y > 275) y = 275;
    doc.setFont("", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("CHAK Field Portal — Staff Timesheet System", margin, y + 4);
    doc.text(
      `Downloaded: ${new Date().toLocaleString("en-KE")}`,
      margin + pageW - 40,
      y + 4,
    );

    // Save
    const fileName = `Timesheet_${submission.staffName.replace(/\s+/g, "_")}_${MONTHS[submission.month]}_${submission.year}.pdf`;
    doc.save(fileName);
    return { success: true };
  } catch (error) {
    console.error("[Timesheet PDF] Error:", error);
    return { success: false, error };
  }
}

function displayStatus(status: string): string {
  switch (status) {
    case "facility_approved":
      return "Facility Approved";
    case "county_approved":
      return "County Approved";
    case "approved":
      return "HR Approved";
    case "returned":
      return "Returned";
    case "pending":
      return "Pending";
    case "draft":
      return "Draft";
    default:
      return status;
  }
}
