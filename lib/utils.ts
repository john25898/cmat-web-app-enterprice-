import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Timesheet Report Export ───────────────────────────────────────────────

function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month, day).getDay();
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function getWorkingDaysInMonth(year: number, month: number): number {
  const days = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

export function exportTimesheetReport(submission: {
  staffName: string;
  staffEmail?: string;
  staffFullName?: string;
  facility: string;
  month: number;
  year: number;
  totalHoursWorked?: number;
  totalHours?: number;
  activities?: Array<{
    project: string;
    activity: string;
    timeEntries: Record<string, number>;
  }>;
  dailyEntries?: Record<number, number>;
}) {
  const activities = submission.activities ?? [];
  const dailyEntries = submission.dailyEntries ?? {};
  const totalHoursWorked =
    submission.totalHoursWorked ?? submission.totalHours ?? 0;

  // Calculate total from activities or dailyEntries
  const totalFromActivities = activities.reduce(
    (sum, act) =>
      sum + Object.values(act.timeEntries).reduce((s, h) => s + (h || 0), 0),
    0,
  );
  const totalFromDaily = Object.values(dailyEntries).reduce(
    (s, h) => s + (h || 0),
    0,
  );
  const displayTotal =
    totalFromActivities > 0
      ? totalFromActivities
      : totalFromDaily > 0
        ? totalFromDaily
        : totalHoursWorked;

  const totalTimeAllocated =
    getWorkingDaysInMonth(submission.year, submission.month) * 8;
  const utilPercent =
    totalTimeAllocated > 0
      ? Math.min((displayTotal / totalTimeAllocated) * 100, 100)
      : 0;

  const lines: string[] = [];
  lines.push("JAMII TEKELEZI - DAILY ACTIVITY TIME SHEET");
  lines.push("=".repeat(80));
  lines.push(
    `Staff: ${submission.staffFullName || submission.staffName} | Email: ${submission.staffEmail || "N/A"}`,
  );
  lines.push(`Facility: ${submission.facility}`);
  lines.push(`Period: ${MONTHS[submission.month]} ${submission.year}`);
  lines.push("");

  if (activities.length > 0) {
    lines.push("--- ACTIVITY BREAKDOWN ---");
    activities.forEach((act) => {
      const actTotal = Object.values(act.timeEntries).reduce(
        (s, h) => s + (h || 0),
        0,
      );
      lines.push(`${act.project} / ${act.activity}: ${actTotal.toFixed(1)}h`);
      Object.entries(act.timeEntries)
        .filter(([, h]) => h && h > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([dateKey, hrs]) => {
          const [y, m, d] = dateKey.split("-");
          const dayNum = parseInt(d);
          const dow = getDayOfWeek(parseInt(y), parseInt(m) - 1, dayNum);
          lines.push(`  Day ${d} (${DAY_NAMES[dow]}): ${hrs.toFixed(1)}h`);
        });
    });
  } else if (Object.keys(dailyEntries).length > 0) {
    lines.push("--- DAILY ENTRIES ---");
    Object.entries(dailyEntries)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([day, hrs]) => {
        const dayNum = parseInt(day);
        const dow = getDayOfWeek(submission.year, submission.month - 1, dayNum);
        lines.push(
          `  Day ${day} (${DAY_NAMES[dow]}): ${(hrs || 0).toFixed(1)}h`,
        );
      });
  }

  lines.push("");
  lines.push(
    `Total Hours Worked: ${displayTotal.toFixed(1)} / ${totalTimeAllocated}h (${utilPercent.toFixed(0)}%)`,
  );

  const blob = new Blob([lines.join("\n")], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Timesheet_${(submission.staffFullName || submission.staffName).replace(/\s/g, "_")}_${MONTHS[submission.month]}_${submission.year}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
