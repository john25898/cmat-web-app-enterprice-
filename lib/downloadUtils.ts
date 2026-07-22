import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ──────────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────────

function getFileName(
  submission: Record<string, unknown>,
  submissionType: string,
  ext: string,
): string {
  const name =
    (submission.officerName as string) ||
    (submission.employeeName as string) ||
    "submission";
  const date = new Date().toISOString().split("T")[0];
  return `${submissionType}_${name}_${date}.${ext}`;
}

function getFacilities(submission: Record<string, unknown>): Array<{
  date: string;
  facility: string;
  activity: string;
  objectives: string;
  budget: number;
}> {
  return (submission.facilities as any[]) || [];
}

function downloadBlob(blob: Blob, fileName: string) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────────────
// CSV
// ──────────────────────────────────────────────────

export function downloadSubmissionAsCSV(
  submission: Record<string, unknown>,
  submissionType: string,
) {
  try {
    let csv = "";
    if (submissionType === "Workplan") {
      csv = generateWorkplanCSV(submission);
    } else if (submissionType === "Report") {
      csv = generateReportCSV(submission);
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, getFileName(submission, submissionType, "csv"));
    return { success: true };
  } catch (error) {
    console.error("[v0] Error downloading CSV:", error);
    return { success: false, error };
  }
}

function escCsv(cell: string): string {
  return `"${cell.replace(/"/g, '""')}"`;
}

function generateWorkplanCSV(submission: Record<string, unknown>): string {
  const facilities = getFacilities(submission);
  const rows: string[][] = [
    ["Field", "Value"],
    ["Officer Name", String(submission.officerName || "")],
    ["Designation", String(submission.designation || "")],
    ["Region", String(submission.region || "")],
    ["Date", String(submission.date || "")],
    ["", ""],
    ["FACILITIES & ACTIVITIES", ""],
  ];
  facilities.forEach((f, i) => {
    rows.push(
      [`Facility ${i + 1}`, ""],
      ["  Date", f.date],
      ["  Facility Visited", f.facility],
      ["  Planned Activity", f.activity],
      ["  Objectives", f.objectives],
      ["  Budget", String(f.budget)],
      ["", ""],
    );
  });
  const total = facilities.reduce((s, f) => s + f.budget, 0);
  rows.push(["Total Budget", String(total)]);
  rows.push(
    ["", ""],
    ["Digital Signature", String(submission.signatureName || "")],
    ["Certified", String(submission.isCertified || false)],
    ["Submitted Date", new Date().toISOString()],
  );
  return rows.map((r) => r.map(escCsv).join(",")).join("\n");
}

function generateReportCSV(submission: Record<string, unknown>): string {
  const rows: string[][] = [
    ["Field", "Value"],
    ["Date", String(submission.date || "")],
    ["Facility", String(submission.facility || "")],
    ["Objectives", String(submission.objectives || "")],
    ["Key Findings", String(submission.findings || "")],
    ["Action Points", String(submission.actionPoints || "")],
    ["Responsible Person", String(submission.responsible || "")],
    ["Linked Workplan", String(submission.linkedWorkplan || "")],
    ["", ""],
    ["Digital Signature", String(submission.signatureName || "")],
    ["Certified", String(submission.isCertified || false)],
    ["Submitted Date", new Date().toISOString()],
  ];
  return rows.map((r) => r.map(escCsv).join(",")).join("\n");
}

// ──────────────────────────────────────────────────
// Word (.doc — HTML-based)
// ──────────────────────────────────────────────────

export function downloadSubmissionAsWord(
  submission: Record<string, unknown>,
  submissionType: string,
) {
  try {
    const html = buildWordHtml(submission, submissionType);
    const blob = new Blob([html], {
      type: "application/msword",
    });
    downloadBlob(blob, getFileName(submission, submissionType, "doc"));
    return { success: true };
  } catch (error) {
    console.error("[v0] Error downloading Word doc:", error);
    return { success: false, error };
  }
}

function buildWordHtml(
  submission: Record<string, unknown>,
  submissionType: string,
): string {
  const name =
    (submission.officerName as string) ||
    (submission.employeeName as string) ||
    "";
  const rows = buildTableRows(submission, submissionType);
  const facilities = getFacilities(submission);

  let facilityTablesHtml = "";
  if (facilities.length > 0) {
    facilityTablesHtml = `
      <h2 style="color:#0369a1;border-bottom:2px solid #0369a1;padding-bottom:6px;margin-top:30px;">Facilities &amp; Activities</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <thead>
          <tr style="background:#0284c7;color:#fff;">
            <th style="padding:10px 12px;text-align:left;border:1px solid #b0c4de;">#</th>
            <th style="padding:10px 12px;text-align:left;border:1px solid #b0c4de;">Date</th>
            <th style="padding:10px 12px;text-align:left;border:1px solid #b0c4de;">Facility Visited</th>
            <th style="padding:10px 12px;text-align:left;border:1px solid #b0c4de;">Planned Activity</th>
            <th style="padding:10px 12px;text-align:left;border:1px solid #b0c4de;">Objectives</th>
            <th style="padding:10px 12px;text-align:right;border:1px solid #b0c4de;">Budget (USD)</th>
          </tr>
        </thead>
        <tbody>
          ${facilities
            .map(
              (f, i) => `
            <tr${i % 2 === 0 ? ' style="background:#f0f7ff;"' : ""}>
              <td style="padding:8px 12px;border:1px solid #b0c4de;text-align:center;">${i + 1}</td>
              <td style="padding:8px 12px;border:1px solid #b0c4de;">${f.date}</td>
              <td style="padding:8px 12px;border:1px solid #b0c4de;">${f.facility}</td>
              <td style="padding:8px 12px;border:1px solid #b0c4de;">${f.activity}</td>
              <td style="padding:8px 12px;border:1px solid #b0c4de;">${f.objectives}</td>
              <td style="padding:8px 12px;border:1px solid #b0c4de;text-align:right;">${f.budget.toLocaleString()}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
        <tfoot>
          <tr style="background:#e0f2fe;font-weight:bold;">
            <td colspan="5" style="padding:10px 12px;border:1px solid #b0c4de;text-align:right;">Total Budget</td>
            <td style="padding:10px 12px;border:1px solid #b0c4de;text-align:right;color:#0369a1;">
              ${facilities.reduce((s, f) => s + f.budget, 0).toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>`;
  }

  const sigHtml = submission.signatureName
    ? `
    <h2 style="color:#0369a1;border-bottom:2px solid #0369a1;padding-bottom:6px;margin-top:30px;">Digital Signature</h2>
    <div style="border:2px solid #0284c7;border-radius:6px;padding:24px 16px;margin-top:8px;text-align:center;">
      <p style="font-size:28px;color:#0369a1;font-family:'Brush Script MT',cursive;margin:0;">
        ${submission.signatureName}
      </p>
    </div>
    ${
      submission.isCertified
        ? '<p style="color:#15803d;font-weight:bold;margin-top:8px;">✓ Digitally certified</p>'
        : ""
    }`
    : "";

  const feedbackHtml = submission.feedback
    ? `
    <h2 style="color:#d97706;border-bottom:2px solid #d97706;padding-bottom:6px;margin-top:30px;">Supervisor Feedback</h2>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:16px;margin-top:8px;">
      <p style="margin:0;color:#92400e;">${submission.feedback}</p>
    </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${submissionType} - ${name}</title>
  <style>
    body { font-family:Calibri,Arial,sans-serif; margin:30px; color:#1e293b; }
    h1 { color:#0369a1; font-size:24px; margin:0 0 4px 0; }
    .subtitle { color:#64748b; font-size:13px; margin:0 0 20px 0; }
    table.info { width:100%; border-collapse:collapse; }
    table.info td { padding:6px 0; font-size:14px; }
    table.info td.label { font-weight:600; color:#475569; width:180px; }
  </style>
</head>
<body>
  <h1>${submissionType}</h1>
  <p class="subtitle">CMaT Enterprise — ${name} — ${new Date().toLocaleDateString()}</p>

  <h2 style="color:#0369a1;border-bottom:2px solid #0369a1;padding-bottom:6px;">Submission Details</h2>
  <table class="info">
    ${rows
      .map((r) => `<tr><td class="label">${r[0]}</td><td>${r[1]}</td></tr>`)
      .join("")}
  </table>

  ${facilityTablesHtml}
  ${sigHtml}
  ${feedbackHtml}

  <p style="margin-top:40px;font-size:11px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:12px;">
    Generated by CMaT Fieldwork Portal — ${new Date().toLocaleString()}
  </p>
</body>
</html>`;
}

// ──────────────────────────────────────────────────
// PDF
// ──────────────────────────────────────────────────

export async function downloadSubmissionAsPDF(
  submission: Record<string, unknown>,
  submissionType: string,
) {
  try {
    const doc = new jsPDF({ format: "a4", unit: "mm" });
    buildPdf(doc, submission, submissionType);
    doc.save(getFileName(submission, submissionType, "pdf"));
    return { success: true };
  } catch (error) {
    console.error("[v0] Error downloading PDF:", error);
    return { success: false, error };
  }
}

function buildPdf(
  doc: jsPDF,
  submission: Record<string, unknown>,
  submissionType: string,
) {
  const pageW = 190; // usable width on A4
  const margin = 10;

  // ── Header ──
  doc.setFontSize(18);
  doc.setTextColor(3, 105, 161);
  doc.text(submissionType, margin, 18);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const name =
    (submission.officerName as string) ||
    (submission.employeeName as string) ||
    "";
  doc.text(`CMaT Enterprise — ${name}`, margin, 25);
  doc.text(new Date().toLocaleDateString(), margin, 31);
  doc.setDrawColor(3, 105, 161);
  doc.line(margin, 34, margin + pageW, 34);

  // ── Info table ──
  const rows = buildTableRows(submission, submissionType);
  autoTable(doc, {
    startY: 40,
    head: [["Field", "Value"]],
    body: rows.map((r) => [r[0], r[1]]),
    theme: "grid",
    headStyles: { fillColor: [2, 132, 199], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [240, 249, 255] },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: "bold", textColor: [71, 85, 105] },
      1: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  });

  // ── Facilities table (Workplan only) ──
  const facilities = getFacilities(submission);
  if (facilities.length > 0) {
    const lastY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(14);
    doc.setTextColor(3, 105, 161);
    doc.text("Facilities & Activities", margin, lastY);

    autoTable(doc, {
      startY: lastY + 5,
      head: [["#", "Date", "Facility", "Activity", "Objectives", "Budget"]],
      body: facilities.map((f, i) => [
        String(i + 1),
        f.date,
        f.facility,
        f.activity,
        f.objectives,
        `USD ${f.budget.toLocaleString()}`,
      ]),
      foot: [
        [
          "",
          "",
          "",
          "",
          "Total Budget",
          `USD ${facilities.reduce((s, f) => s + f.budget, 0).toLocaleString()}`,
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [2, 132, 199], textColor: 255, fontSize: 8 },
      footStyles: {
        fillColor: [224, 242, 254],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 249, 255] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        5: { cellWidth: 25, halign: "right" },
      },
      margin: { left: margin, right: margin },
    });
  }

  // ── Signature ──
  if (submission.signatureName) {
    const lastY = (doc as any).lastAutoTable?.finalY ?? 50;
    let y = lastY + 14;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(14);
    doc.setTextColor(3, 105, 161);
    doc.text("Digital Signature", margin, y);
    doc.setDrawColor(2, 132, 199);
    doc.roundedRect(margin, y + 4, pageW, 20, 3, 3);
    doc.setFontSize(22);
    doc.setTextColor(3, 105, 161);
    doc.text(String(submission.signatureName), margin + 8, y + 18, {
      charSpace: 0.5,
    });
    if (submission.isCertified) {
      doc.setFontSize(9);
      doc.setTextColor(21, 128, 61);
      doc.text("✓ Digitally certified", margin, y + 30);
    }
  }

  // ── Feedback ──
  if (submission.feedback) {
    const lastY = (doc as any).lastAutoTable?.finalY ?? 50;
    let y = Math.max(lastY + 14, 70);
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(14);
    doc.setTextColor(217, 119, 6);
    doc.text("Supervisor Feedback", margin, y);
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    const lines = doc.splitTextToSize(String(submission.feedback), pageW - 8);
    doc.text(lines, margin + 4, y + 8);
  }

  // ── Footer ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `CMaT Fieldwork Portal — ${new Date().toLocaleString()}`,
      margin,
      doc.internal.pageSize.height - 8,
    );
  }
}

// ──────────────────────────────────────────────────
// Shared: build clean table rows from submission
// ──────────────────────────────────────────────────

function buildTableRows(
  submission: Record<string, unknown>,
  submissionType: string,
): Array<[string, string]> {
  const rows: Array<[string, string]> = [];

  if (submissionType === "Workplan") {
    rows.push(["Officer Name", String(submission.officerName || "")]);
    rows.push(["Designation", String(submission.designation || "")]);
    rows.push(["Region", String(submission.region || "")]);
    rows.push(["Date", String(submission.date || "")]);
  } else {
    rows.push(["Date", String(submission.date || "")]);
    rows.push(["Facility", String(submission.facility || "")]);
    rows.push(["Objectives", String(submission.objectives || "")]);
    rows.push(["Key Findings", String(submission.findings || "")]);
    rows.push(["Action Points", String(submission.actionPoints || "")]);
    rows.push(["Responsible Person", String(submission.responsible || "")]);
    rows.push(["Linked Workplan", String(submission.linkedWorkplan || "")]);
  }

  return rows;
}
