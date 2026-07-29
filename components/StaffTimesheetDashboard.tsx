"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LogOut,
  Clock,
  Send,
  Bell,
  CheckCircle,
  AlertCircle,
  FileText,
  X,
  RotateCcw,
  PenLine,
  Check,
  Calendar,
  FileSpreadsheet,
  Umbrella,
  ShieldCheck,
  Trash2,
  Download,
} from "lucide-react";
import { downloadTimesheetPDF } from "@/lib/timesheetDownload";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TimesheetActivity {
  id: string;
  project: string;
  activity: string;
  timeEntries: Record<string, number>; // "YYYY-MM-DD" -> hours
}

export interface TimesheetSubmission {
  id: string;
  staffEmail: string;
  staffName: string;
  facility: string;
  year: number;
  month: number;
  totalHoursWorked: number;
  dailyEntries?: Record<number, number>;
  activities?: TimesheetActivity[];
  status:
    | "draft"
    | "pending"
    | "facility_approved"
    | "county_approved"
    | "approved"
    | "returned";
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewFeedback?: string;
  reviewedBy?: string;
  reviewedByEmail?: string;
  staffFullName?: string;
  staffCounty?: string;
  staffJobTitle?: string;
  staffTelephone?: string;
  employeeSignature?: string;
  employeeSignDate?: string;
  supervisorName?: string;
  supervisorDesignation?: string;
  supervisorSign?: string;
  supervisorDate?: string;
  hrName?: string;
  hrComment?: string;
  hrDate?: string;
  hrSign?: string;
  countyRepName?: string;
  countyRepComment?: string;
  countyRepDate?: string;
  countyRepSign?: string;
}

export interface LeaveRequest {
  id: string;
  staffEmail: string;
  staffName: string;
  facility: string;
  leaveType: string;
  leaveDays: number;
  hoursTaken: number;
  startDate: string;
  reportingDate: string;
  employeeSignature?: string;
  employeeDate?: string;
  supervisorName?: string;
  supervisorDesignation?: string;
  supervisorSign?: string;
  supervisorDate?: string;
  hrName?: string;
  hrComment?: string;
  hrDate?: string;
  hrSign?: string;
  status: "draft" | "pending" | "approved" | "returned";
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewFeedback?: string;
  reviewedBy?: string;
  reviewedByEmail?: string;
}

interface StaffTimesheetDashboardProps {
  userEmail: string;
  onLogout: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "chak-timesheet-submissions";
const LEAVE_KEY = "chak-leave-requests";

const LEAVE_TYPES = [
  { value: "annual", label: "Annual leave" },
  { value: "maternity", label: "Maternity leave" },
  { value: "paternity", label: "Paternity leave" },
  { value: "sick", label: "Sick leave" },
  { value: "compassionate", label: "Compassionate leave" },
  { value: "public_holiday", label: "Public Holiday (declared)" },
] as const;

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadAllSubmissions(): TimesheetSubmission[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAllSubmissions(subs: TimesheetSubmission[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
}

function loadAllLeaves(): LeaveRequest[] {
  try {
    return JSON.parse(localStorage.getItem(LEAVE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAllLeaves(leaves: LeaveRequest[]) {
  localStorage.setItem(LEAVE_KEY, JSON.stringify(leaves));
}

function deriveName(email: string): string {
  return email
    .split("@")[0]
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function generateId(): string {
  return "ts_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getWorkingDaysInMonth(year: number, month: number): number {
  const totalDays = getDaysInMonth(year, month);
  let working = 0;
  for (let d = 1; d <= totalDays; d++) {
    const day = new Date(year, month, d).getDay();
    if (day !== 0 && day !== 6) working++;
  }
  return working;
}

function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month, day).getDay();
}

function isWeekend(year: number, month: number, day: number): boolean {
  const d = getDayOfWeek(year, month, day);
  return d === 0 || d === 6;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeeksInMonth(year: number, month: number): number {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const offset = (firstDow + 6) % 7; // days from 1st back to previous Monday
  return Math.ceil((daysInMonth + offset) / 7);
}

function getWeekForDay(year: number, month: number, day: number): number {
  const firstDow = new Date(year, month, 1).getDay();
  const offset = (firstDow + 6) % 7;
  return Math.floor((day - 1 + offset) / 7);
}

function getWeekDays(year: number, month: number, weekIndex: number): number[] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const offset = (firstDow + 6) % 7; // days from 1st back to previous Monday
  const virtualMon = weekIndex * 7 - offset + 1; // Monday of this week (may be <1 or >daysInMonth)
  const startDay = Math.max(1, virtualMon);
  const endDay = Math.min(daysInMonth, virtualMon + 6);
  const days: number[] = [];
  for (let d = startDay; d <= endDay; d++) {
    days.push(d);
  }
  return days;
}

function statusColor(status: string) {
  switch (status) {
    case "draft":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "pending":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "facility_approved":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "county_approved":
      return "bg-teal-100 text-teal-800 border-teal-200";
    case "approved":
      return "bg-green-100 text-green-800 border-green-200";
    case "returned":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Open";
    case "pending":
      return "Submitted";
    case "facility_approved":
      return "Facility Approved";
    case "county_approved":
      return "County Approved";
    case "approved":
      return "Approved";
    case "returned":
      return "Returned";
    default:
      return status;
  }
}

function leaveStatusColor(status: string) {
  switch (status) {
    case "draft":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "pending":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "approved":
      return "bg-green-100 text-green-800 border-green-200";
    case "returned":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function leaveTypeLabel(value: string): string {
  return LEAVE_TYPES.find((l) => l.value === value)?.label || value;
}

// ─── Signing Modal ────────────────────────────────────────────────────────────

function SigningModal({
  totalHours,
  totalAllocated,
  onSign,
  onClose,
}: {
  totalHours: number;
  totalAllocated: number;
  onSign: (certified: boolean) => void;
  onClose: () => void;
}) {
  const [isCertified, setIsCertified] = useState(false);
  const [signatureName, setSignatureName] = useState("");

  const handleSign = () => {
    if (!signatureName.trim()) {
      alert("Please enter your full name to sign");
      return;
    }
    if (!isCertified) {
      alert("Please certify the accuracy of your timesheet");
      return;
    }
    onSign(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-indigo-100/60">
        <div className="flex items-center justify-between border-b border-indigo-100/60 px-6 py-5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-indigo-200" />
            <h2 className="text-lg font-bold text-white">
              Digital Signing &amp; Submission
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-indigo-200 hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="rounded-xl border border-indigo-100/60 bg-gradient-to-br from-indigo-50 to-white p-5">
            <h3 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">
              Submission Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Total Hours Worked</p>
                <p className="text-xl font-bold text-indigo-700">
                  {totalHours.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Time Allocated</p>
                <p className="text-xl font-bold text-gray-900">
                  {totalAllocated}h
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
            <p className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Attestation Clause
            </p>
            <p className="text-xs text-amber-800 leading-relaxed">
              I certify that the hours recorded above represent a true and
              accurate reflection of the time worked during this period.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Your Full Name{" "}
              <span className="text-gray-400">(Digital Signature)</span>
            </label>
            <input
              type="text"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Type your full name as signature..."
              className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 shadow-sm"
            />
          </div>
          {signatureName && (
            <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 flex items-center justify-center min-h-[70px] shadow-inner">
              <p
                className="text-2xl text-indigo-700 font-['cursive'] tracking-wider"
                style={{
                  fontFamily: "'Brush Script MT', 'Great Vibes', cursive",
                }}
              >
                {signatureName}
              </p>
            </div>
          )}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div
              onClick={() => setIsCertified(!isCertified)}
              className={`shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${isCertified ? "border-indigo-600 bg-indigo-600" : "border-gray-300 group-hover:border-indigo-400"}`}
            >
              {isCertified && <Check className="h-3.5 w-3.5 text-white" />}
            </div>
            <span className="text-sm text-gray-600 leading-relaxed">
              I certify that the information provided is accurate and complete
              to the best of my knowledge.
            </span>
          </label>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-indigo-100/60 px-6 py-4 bg-gradient-to-r from-gray-50 to-white rounded-b-2xl">
          <button
            onClick={onClose}
            className="rounded-xl border border-indigo-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSign}
            disabled={!isCertified || !signatureName.trim()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-2.5 text-sm font-semibold text-white hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md shadow-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PenLine className="h-4 w-4" /> Sign &amp; Submit
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function StaffTimesheetDashboard({
  userEmail,
  onLogout,
}: StaffTimesheetDashboardProps) {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<"timesheet" | "leave">(
    "timesheet",
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Timesheet State ──
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [showSignModal, setShowSignModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const staffName = deriveName(userEmail);

  // ── Editable Profile State ──
  const [staffJobTitle, setStaffJobTitle] = useState("Medical Officer");
  const [staffFacility, setStaffFacility] = useState("Main Facility");
  const [staffCounty, setStaffCounty] = useState("Nairobi");
  const [staffTelephone, setStaffTelephone] = useState("+254 7XX XXX XXX");

  const [allSubmissions, setAllSubmissions] = useState<TimesheetSubmission[]>(
    [],
  );
  const [activities, setActivities] = useState<TimesheetActivity[]>([]);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newProject, setNewProject] = useState("");
  const [newActivity, setNewActivity] = useState("");

  const [hourError, setHourError] = useState<string | null>(null);

  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState("");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveReportingDate, setLeaveReportingDate] = useState("");
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveSignature, setLeaveSignature] = useState("");

  // ── Load Data ──
  const refreshTimesheets = useCallback(
    () => setAllSubmissions(loadAllSubmissions()),
    [],
  );
  const refreshLeaves = useCallback(() => setAllLeaves(loadAllLeaves()), []);

  useEffect(() => {
    refreshTimesheets();
    refreshLeaves();
  }, [refreshTimesheets, refreshLeaves]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // ── Computed Timesheet ──
  const weeksInMonth = getWeeksInMonth(selectedYear, selectedMonth);
  const currentSubmission = allSubmissions.find(
    (s) =>
      s.staffEmail === userEmail &&
      s.year === selectedYear &&
      s.month === selectedMonth,
  );

  // Sync activities when submission changes
  const prevSubmissionRef = useRef(currentSubmission);
  useEffect(() => {
    if (prevSubmissionRef.current !== currentSubmission) {
      prevSubmissionRef.current = currentSubmission;
      if (
        currentSubmission?.activities &&
        currentSubmission.activities.length > 0
      ) {
        setActivities(currentSubmission.activities);
      } else if (!currentSubmission) {
        // Only reset to empty if there's NO submission at all (not just no activities)
        setActivities([]);
      }
    }
  }, [currentSubmission]);

  // Sync profile fields from submission when it loads
  useEffect(() => {
    if (currentSubmission) {
      if (currentSubmission.staffJobTitle)
        setStaffJobTitle(currentSubmission.staffJobTitle);
      if (currentSubmission.facility)
        setStaffFacility(currentSubmission.facility);
      if (currentSubmission.staffCounty)
        setStaffCounty(currentSubmission.staffCounty);
      if (currentSubmission.staffTelephone)
        setStaffTelephone(currentSubmission.staffTelephone);
    }
  }, [currentSubmission]);

  // Save profile to submission whenever it changes
  const saveProfileToSubmission = useCallback(
    (jobTitle: string, facility: string, county: string, phone: string) => {
      const subs = loadAllSubmissions();
      let sub = subs.find(
        (s) =>
          s.staffEmail === userEmail &&
          s.year === selectedYear &&
          s.month === selectedMonth,
      );
      if (sub) {
        sub.staffJobTitle = jobTitle;
        sub.facility = facility;
        sub.staffCounty = county;
        sub.staffTelephone = phone;
        saveAllSubmissions(subs);
        refreshTimesheets();
      }
    },
    [userEmail, selectedYear, selectedMonth, refreshTimesheets],
  );

  // Compute activity totals per day
  const dailyEntriesMap: Record<number, number> = {};
  activities.forEach((act) => {
    Object.entries(act.timeEntries).forEach(([dateKey, hrs]) => {
      const day = parseInt(dateKey.split("-")[2]);
      if (!isNaN(day)) {
        dailyEntriesMap[day] = (dailyEntriesMap[day] || 0) + hrs;
      }
    });
  });

  const totalHours = activities.reduce((sum, act) => {
    return (
      sum + Object.values(act.timeEntries).reduce((s, h) => s + (h || 0), 0)
    );
  }, 0);
  // If no activities but submission has totalHoursWorked, use that
  const displayTotalHours =
    totalHours > 0 ? totalHours : (currentSubmission?.totalHoursWorked ?? 0);

  const totalTimeAllocated =
    getWorkingDaysInMonth(selectedYear, selectedMonth) * 8;
  const utilPercent =
    totalTimeAllocated > 0
      ? Math.min((displayTotalHours / totalTimeAllocated) * 100, 100)
      : 0;
  const isSubmitted =
    currentSubmission?.status === "pending" ||
    currentSubmission?.status === "facility_approved" ||
    currentSubmission?.status === "county_approved" ||
    currentSubmission?.status === "approved";
  const isApproved =
    currentSubmission?.status === "facility_approved" ||
    currentSubmission?.status === "county_approved" ||
    currentSubmission?.status === "approved";

  // ── Timesheet Actions ──

  const saveCurrentToStorage = useCallback(
    (act: TimesheetActivity[]) => {
      const subs = loadAllSubmissions();
      const computed = act.reduce((sum, a) => {
        return (
          sum + Object.values(a.timeEntries).reduce((s, h) => s + (h || 0), 0)
        );
      }, 0);
      // Also compute dailyEntries for backward compatibility
      const dayMap: Record<number, number> = {};
      act.forEach((a) => {
        Object.entries(a.timeEntries).forEach(([dateKey, hrs]) => {
          const day = parseInt(dateKey.split("-")[2]);
          if (!isNaN(day)) {
            dayMap[day] = (dayMap[day] || 0) + hrs;
          }
        });
      });

      let sub = subs.find(
        (s) =>
          s.staffEmail === userEmail &&
          s.year === selectedYear &&
          s.month === selectedMonth,
      );
      if (!sub) {
        sub = {
          id: generateId(),
          staffEmail: userEmail,
          staffName,
          facility: "Main Facility",
          year: selectedYear,
          month: selectedMonth,
          totalHoursWorked: computed,
          dailyEntries: dayMap,
          activities: act,
          status: "draft",
          createdAt: new Date().toISOString(),
        };
        subs.push(sub);
      } else {
        sub.totalHoursWorked = computed;
        sub.dailyEntries = dayMap;
        sub.activities = act;
      }
      saveAllSubmissions(subs);
      refreshTimesheets();
    },
    [userEmail, selectedYear, selectedMonth, staffName, refreshTimesheets],
  );

  const handleActivityHourChange = (
    activityId: string,
    day: number,
    value: string,
  ) => {
    const parsed = parseFloat(value);
    if (parsed > 10) {
      setHourError("Hours cannot exceed 10 per day");
      return;
    }
    setHourError(null);
    const hours = isNaN(parsed) ? 0 : parsed;
    const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const updated = activities.map((act) => {
      if (act.id === activityId) {
        return {
          ...act,
          timeEntries: { ...act.timeEntries, [dateKey]: hours },
        };
      }
      return act;
    });
    setActivities(updated);
  };

  const handleActivityHourBlur = () => {
    saveCurrentToStorage(activities);
    setHourError(null);
    setToastMessage("Timesheet saved");
  };

  const handleAddActivity = () => {
    if (!newProject.trim() || !newActivity.trim()) {
      setToastMessage("Please enter both project and activity");
      return;
    }
    const newAct: TimesheetActivity = {
      id: "act_" + Date.now(),
      project: newProject.trim(),
      activity: newActivity.trim(),
      timeEntries: {},
    };
    const updated = [...activities, newAct];
    setActivities(updated);
    setNewProject("");
    setNewActivity("");
    setShowAddActivity(false);
    saveCurrentToStorage(updated);
    setToastMessage("Activity added");
  };

  const handleRemoveActivity = (id: string) => {
    const updated = activities.filter((a) => a.id !== id);
    setActivities(updated);
    saveCurrentToStorage(updated);
    setToastMessage("Activity removed");
  };

  // ── Auto-calculate Leave Reporting Date ──

  useEffect(() => {
    if (leaveStartDate && leaveDays > 0) {
      const start = new Date(leaveStartDate + "T00:00:00");
      start.setDate(start.getDate() + leaveDays);
      const year = start.getFullYear();
      const month = String(start.getMonth() + 1).padStart(2, "0");
      const day = String(start.getDate()).padStart(2, "0");
      setLeaveReportingDate(`${year}-${month}-${day}`);
    }
  }, [leaveStartDate, leaveDays]);

  const handleSendForApproval = () => {
    if (displayTotalHours <= 0) {
      setToastMessage("Please enter hours before submitting.");
      return;
    }
    setShowSignModal(true);
  };

  const handleSignSubmit = () => {
    const subs = loadAllSubmissions();
    const idx = subs.findIndex(
      (s) =>
        s.staffEmail === userEmail &&
        s.year === selectedYear &&
        s.month === selectedMonth,
    );
    if (idx === -1) return;
    subs[idx].status = "pending";
    subs[idx].submittedAt = new Date().toISOString();
    subs[idx].employeeSignature = staffName;
    subs[idx].employeeSignDate = formatDate(now);
    saveAllSubmissions(subs);
    refreshTimesheets();
    setShowSignModal(false);
    setToastMessage("Timesheet submitted for approval");
  };

  const handleExportReport = () => {
    if (displayTotalHours <= 0) {
      setToastMessage("No data to export");
      return;
    }
    const lines: string[] = [];
    lines.push("JAMII TEKELEZI - DAILY ACTIVITY TIME SHEET");
    lines.push("=".repeat(80));
    lines.push(`Staff: ${staffName} | Email: ${userEmail}`);
    lines.push(`Facility: Main Facility`);
    lines.push(`Period: ${MONTHS[selectedMonth]} ${selectedYear}`);
    lines.push("");
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
    lines.push("");
    lines.push(
      `Total Hours Worked: ${displayTotalHours.toFixed(1)} / ${totalTimeAllocated}h (${utilPercent.toFixed(0)}%)`,
    );
    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Timesheet_${staffName.replace(/\s/g, "_")}_${MONTHS[selectedMonth]}_${selectedYear}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setToastMessage("Report downloaded");
  };

  // ── Leave Actions ──

  const handleSubmitLeave = () => {
    if (!selectedLeaveType) {
      setToastMessage("Please select a leave type");
      return;
    }
    if (!leaveStartDate) {
      setToastMessage("Please select start date");
      return;
    }
    if (!leaveReportingDate) {
      setToastMessage("Please select reporting date");
      return;
    }
    if (!leaveSignature.trim()) {
      setToastMessage("Please enter your signature");
      return;
    }

    const leaves = loadAllLeaves();
    leaves.push({
      id: generateId(),
      staffEmail: userEmail,
      staffName,
      facility: "Main Facility",
      leaveType: selectedLeaveType,
      leaveDays,
      hoursTaken: leaveDays * 8,
      startDate: leaveStartDate,
      reportingDate: leaveReportingDate,
      employeeSignature: leaveSignature,
      employeeDate: formatDate(now),
      status: "pending",
      createdAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
    });
    saveAllLeaves(leaves);
    refreshLeaves();
    setSelectedLeaveType("");
    setLeaveStartDate("");
    setLeaveReportingDate("");
    setLeaveDays(1);
    setLeaveSignature("");
    setToastMessage("Leave request submitted for approval");
  };

  const handleDeleteLeave = (leaveId: string) => {
    saveAllLeaves(loadAllLeaves().filter((l) => l.id !== leaveId));
    refreshLeaves();
    setToastMessage("Leave request removed");
  };

  // ── Render ──

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/80">
      {/* ── Top Navigation Bar ── */}
      <div className="sticky top-0 z-30 border-b border-indigo-100/60 bg-white/80 backdrop-blur-lg shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 shadow-md shadow-indigo-200">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-800 to-indigo-600 bg-clip-text text-transparent">
                ESS Timesheet
              </h1>
              <p className="text-[11px] text-indigo-400 font-medium tracking-wide">
                Employee Self-Service Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {currentSubmission?.status === "returned" && (
              <button
                onClick={() =>
                  setToastMessage(
                    "Your timesheet was returned. Please revise and resubmit.",
                  )
                }
                className="relative flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/80 backdrop-blur-sm px-3.5 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors shadow-sm"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Returned
                <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                </span>
              </button>
            )}
            <button className="relative rounded-xl p-2.5 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-indigo-100">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 text-xs font-bold text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-100">
                {staffName.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {staffName}
                </p>
                <p className="text-[11px] text-gray-500">{userEmail}</p>
              </div>
              <button
                onClick={onLogout}
                className="ml-1 rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex border-t border-indigo-100/60 px-6">
          <button
            onClick={() => setActiveTab("timesheet")}
            className={`relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors ${activeTab === "timesheet" ? "text-indigo-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600 after:rounded-full" : "text-gray-500 hover:text-indigo-600"}`}
          >
            <Clock className="h-4 w-4" /> Timesheet
          </button>
          <button
            onClick={() => setActiveTab("leave")}
            className={`relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors ${activeTab === "leave" ? "text-indigo-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600 after:rounded-full" : "text-gray-500 hover:text-indigo-600"}`}
          >
            <Umbrella className="h-4 w-4" /> Employee Leave Request
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {toastMessage && (
        <div className="border-b border-indigo-100/60 bg-gradient-to-r from-indigo-50 to-white px-6 py-2.5">
          <p className="text-sm text-indigo-800 flex items-center gap-2 font-medium">
            {toastMessage.includes("✓") ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            )}
            {toastMessage}
          </p>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* ════════════════════════════════════════════════════ */}
        {/* TAB 1: TIMESHEET (ESS Portal Style)                 */}
        {/* ════════════════════════════════════════════════════ */}
        {activeTab === "timesheet" && (
          <>
            {/* ── Top Info Bar: Year Filter / Current Period / Sheet No ── */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5 bg-white rounded-2xl border border-indigo-100/60 shadow-lg shadow-indigo-100/20 px-5 py-4">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Year Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Year
                  </span>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(parseInt(e.target.value));
                      setSelectedWeek(0);
                    }}
                    className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                  >
                    {Array.from(
                      { length: 7 },
                      (_, i) => selectedYear - 3 + i,
                    ).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Month Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Month
                  </span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(parseInt(e.target.value));
                      setSelectedWeek(0);
                    }}
                    className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-5 flex-wrap">
                {/* Current Period */}
                <div className="flex items-center gap-2 text-xs bg-indigo-50 rounded-lg px-3 py-1.5 border border-indigo-100">
                  <span className="text-indigo-400 font-medium">
                    Current Period:
                  </span>
                  <span className="font-bold text-indigo-700">
                    {MONTHS[selectedMonth]} -{" "}
                    {`${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`}
                  </span>
                </div>
                {/* Sheet Number */}
                <div className="flex items-center gap-2 text-xs bg-amber-50 rounded-lg px-3 py-1.5 border border-amber-100">
                  <span className="text-amber-500 font-medium">No.</span>
                  <span className="font-bold text-amber-700">
                    {String(
                      Math.abs(
                        allSubmissions.findIndex(
                          (s) =>
                            s.staffEmail === userEmail &&
                            s.year === selectedYear &&
                            s.month === selectedMonth,
                        ) + 1,
                      ),
                    ).padStart(5, "0")}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Editable Profile Card: Job Title · Facility · County · Phone ── */}
            <div className="mb-5 bg-white rounded-2xl border border-indigo-100/60 shadow-lg shadow-indigo-100/20 px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Job Title
                  </label>
                  <div className="w-full rounded-lg border border-indigo-200 bg-indigo-100/50 px-3 py-2 text-sm font-semibold text-gray-700 select-none">
                    {staffJobTitle || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Facility
                  </label>
                  <select
                    value={staffFacility}
                    onChange={(e) => {
                      setStaffFacility(e.target.value);
                      saveProfileToSubmission(
                        staffJobTitle,
                        e.target.value,
                        staffCounty,
                        staffTelephone,
                      );
                    }}
                    className="w-full rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-sm font-semibold text-gray-900 focus:border-indigo-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="Main Facility">Main Facility</option>
                    <option value="Meru Health Center">
                      Meru Health Center
                    </option>
                    <option value="Nairobi Clinic">Nairobi Clinic</option>
                    <option value="Kisumu Hospital">Kisumu Hospital</option>
                    <option value="Mombasa Health Center">
                      Mombasa Health Center
                    </option>
                    <option value="Eldoret Medical Center">
                      Eldoret Medical Center
                    </option>
                    <option value="Nakuru Clinic">Nakuru Clinic</option>
                    <option value="Machakos Health Center">
                      Machakos Health Center
                    </option>
                    <option value="Embu Hospital">Embu Hospital</option>
                    <option value="Kitale Medical Center">
                      Kitale Medical Center
                    </option>
                    <option value="Nyeri Clinic">Nyeri Clinic</option>
                    <option value="Kakamega Health Center">
                      Kakamega Health Center
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    County
                  </label>
                  <div className="w-full rounded-lg border border-indigo-200 bg-indigo-100/50 px-3 py-2 text-sm font-semibold text-gray-700 select-none">
                    {staffCounty || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={staffTelephone}
                    onChange={(e) => {
                      setStaffTelephone(e.target.value);
                      saveProfileToSubmission(
                        staffJobTitle,
                        staffFacility,
                        staffCounty,
                        e.target.value,
                      );
                    }}
                    className="w-full rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-sm font-semibold text-gray-900 focus:border-indigo-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-6">
              {/* ── Left Sidebar: Staff Info & Stats ── */}
              <div className="w-64 shrink-0 space-y-4">
                <div className="rounded-2xl border border-indigo-100/60 bg-white shadow-lg shadow-indigo-100/20 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 text-base font-bold text-white shadow-md">
                      {staffName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {staffName}
                      </p>
                      <p className="text-[10px] text-gray-500">{userEmail}</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Month</span>
                      <span className="font-semibold text-gray-800">
                        {MONTHS[selectedMonth]} {selectedYear}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Recorded</span>
                      <span className="font-semibold text-indigo-700">
                        {displayTotalHours.toFixed(1)}h
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Required</span>
                      <span className="font-semibold text-gray-700">
                        {totalTimeAllocated}h
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Productive</span>
                      <span
                        className={`font-semibold ${utilPercent >= 100 ? "text-green-600" : "text-amber-600"}`}
                      >
                        {utilPercent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Status</span>
                        {currentSubmission ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusColor(currentSubmission.status)}`}
                          >
                            {statusLabel(currentSubmission.status)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-yellow-100 text-yellow-800">
                            Open
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Main Timesheet Area ── */}
              <div className="flex-1 min-w-0">
                {/* ── Month Tabs ── */}
                <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                  {MONTHS.map((m, i) => {
                    const isCurrent = i === selectedMonth;
                    const hasData = allSubmissions.some(
                      (s) =>
                        s.staffEmail === userEmail &&
                        s.year === selectedYear &&
                        s.month === i,
                    );
                    return (
                      <button
                        key={m}
                        onClick={() => {
                          setSelectedMonth(i);
                          setSelectedWeek(0);
                        }}
                        className={`relative flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                          isCurrent
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                            : hasData
                              ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                              : "text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {hasData && !isCurrent && (
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                        )}
                        {m.substring(0, 3)}
                      </button>
                    );
                  })}
                </div>

                {/* ── Action Buttons ── */}
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search activities..."
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm w-48 focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleExportReport}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                    >
                      <FileText className="h-3.5 w-3.5" /> Timesheet Report
                    </button>
                    {!isSubmitted && displayTotalHours > 0 && (
                      <button
                        onClick={handleSendForApproval}
                        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:from-green-700 transition-all shadow-md shadow-green-200"
                      >
                        <Send className="h-3.5 w-3.5" /> Send for Approval
                      </button>
                    )}
                    {!isSubmitted && (
                      <button
                        onClick={() => setShowAddActivity(true)}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
                      >
                        + Add Activities
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Add Activity Form ── */}
                {showAddActivity && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 mb-4">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
                          Project
                        </label>
                        <input
                          type="text"
                          value={newProject}
                          onChange={(e) => setNewProject(e.target.value)}
                          placeholder="Project name"
                          className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAddActivity()
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
                          Activity
                        </label>
                        <input
                          type="text"
                          value={newActivity}
                          onChange={(e) => setNewActivity(e.target.value)}
                          placeholder="Activity description"
                          className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAddActivity()
                          }
                        />
                      </div>
                      <button
                        onClick={handleAddActivity}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowAddActivity(false);
                          setNewProject("");
                          setNewActivity("");
                        }}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Week Tabs ── */}
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: weeksInMonth }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedWeek(i)}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                        selectedWeek === i
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Week {i + 1}
                    </button>
                  ))}
                </div>

                {/* ── Hour Error Banner ── */}
                {hourError && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {hourError}
                  </div>
                )}

                {/* ── Activity Grid ── */}
                {activities.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-white/50 p-12 text-center">
                    <p className="text-sm text-gray-500 mb-2">
                      No activities added yet
                    </p>
                    <p className="text-xs text-gray-400">
                      Click "+ Add Activities" to start building your timesheet
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-indigo-100/60 bg-white shadow-lg shadow-indigo-100/20 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-gradient-to-r from-indigo-600 to-indigo-800">
                            <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase w-[20%] border-r border-indigo-500">
                              Project
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase w-[25%] border-r border-indigo-500">
                              Activity
                            </th>
                            {getWeekDays(
                              selectedYear,
                              selectedMonth,
                              selectedWeek,
                            ).map((day) => {
                              const dow = getDayOfWeek(
                                selectedYear,
                                selectedMonth,
                                day,
                              );
                              const isWknd = dow === 0 || dow === 6;
                              return (
                                <th
                                  key={day}
                                  className={`px-3 py-3 text-center text-xs font-bold border-r border-indigo-500 last:border-r-0 ${isWknd ? "text-red-300" : "text-white"}`}
                                >
                                  <div className="text-base font-bold">
                                    {day}
                                  </div>
                                  <div className="text-[10px] opacity-80">
                                    {DAY_NAMES[dow]}
                                  </div>
                                </th>
                              );
                            })}
                            <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase w-[10%]">
                              Total
                            </th>
                            {!isSubmitted && (
                              <th className="px-2 py-3 text-center text-xs font-bold text-white w-[5%]"></th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {activities
                            .filter((act) =>
                              searchQuery
                                ? act.project
                                    .toLowerCase()
                                    .includes(searchQuery.toLowerCase()) ||
                                  act.activity
                                    .toLowerCase()
                                    .includes(searchQuery.toLowerCase())
                                : true,
                            )
                            .map((act, idx) => {
                              const weekDays = getWeekDays(
                                selectedYear,
                                selectedMonth,
                                selectedWeek,
                              );
                              const actTotal = weekDays.reduce((sum, day) => {
                                const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                return sum + (act.timeEntries[dateKey] || 0);
                              }, 0);

                              return (
                                <tr
                                  key={act.id}
                                  className={`border-b border-gray-100 transition-colors hover:bg-indigo-50/30 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                                >
                                  <td className="px-4 py-3 border-r border-gray-100">
                                    <p className="text-sm font-semibold text-gray-800">
                                      {act.project}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3 border-r border-gray-100">
                                    <p className="text-sm text-gray-700">
                                      {act.activity}
                                    </p>
                                  </td>
                                  {weekDays.map((day) => {
                                    const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                    const val = act.timeEntries[dateKey] || 0;
                                    const dow = getDayOfWeek(
                                      selectedYear,
                                      selectedMonth,
                                      day,
                                    );
                                    const isWknd = dow === 0 || dow === 6;
                                    return (
                                      <td
                                        key={day}
                                        className={`px-3 py-3 text-center border-r border-gray-100 last:border-r-0 ${isWknd ? "bg-red-50/40" : ""}`}
                                      >
                                        {isSubmitted ? (
                                          <span className="text-sm font-bold text-indigo-700">
                                            {val > 0 ? val.toFixed(1) : "—"}
                                          </span>
                                        ) : (
                                          <input
                                            type="number"
                                            min={0}
                                            max={10}
                                            step={0.5}
                                            value={val > 0 ? val : ""}
                                            onChange={(e) =>
                                              handleActivityHourChange(
                                                act.id,
                                                day,
                                                e.target.value,
                                              )
                                            }
                                            onBlur={handleActivityHourBlur}
                                            disabled={isWknd}
                                            className={`w-20 rounded-lg border-2 px-2 py-1.5 text-center text-sm font-bold focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                              isWknd
                                                ? "bg-red-50 border-red-200 text-red-300 cursor-not-allowed"
                                                : hourError
                                                  ? "border-red-400 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-100"
                                                  : "border-indigo-200 bg-white text-indigo-700 focus:border-indigo-400 focus:ring-indigo-100"
                                            }`}
                                            placeholder={isWknd ? "—" : ""}
                                          />
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="px-3 py-3 text-center border-l border-gray-100">
                                    <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700">
                                      {actTotal.toFixed(1)}
                                    </span>
                                  </td>
                                  {!isSubmitted && (
                                    <td className="px-2 py-3 text-center">
                                      <button
                                        onClick={() =>
                                          handleRemoveActivity(act.id)
                                        }
                                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                                        title="Remove activity"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          {/* ── Total Row ── */}
                          <tr className="bg-gradient-to-r from-indigo-50 to-blue-50 border-t-2 border-indigo-200">
                            <td
                              colSpan={2}
                              className="px-4 py-3 text-right text-sm font-bold text-gray-800"
                            >
                              Total for Week {selectedWeek + 1}
                            </td>
                            {getWeekDays(
                              selectedYear,
                              selectedMonth,
                              selectedWeek,
                            ).map((day) => {
                              const dayTotal = activities.reduce((sum, act) => {
                                const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                return sum + (act.timeEntries[dateKey] || 0);
                              }, 0);
                              return (
                                <td
                                  key={day}
                                  className="px-2 py-3 text-center border-r border-indigo-100 last:border-r-0 font-bold text-indigo-800 text-sm"
                                >
                                  {dayTotal > 0 ? dayTotal.toFixed(1) : "—"}
                                </td>
                              );
                            })}
                            <td className="px-3 py-3 text-center border-l border-indigo-100">
                              <span className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-3 py-1 text-sm font-bold text-white">
                                {activities
                                  .reduce((sum, act) => {
                                    const weekDays = getWeekDays(
                                      selectedYear,
                                      selectedMonth,
                                      selectedWeek,
                                    );
                                    return (
                                      sum +
                                      weekDays.reduce((s, day) => {
                                        const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                        return (
                                          s + (act.timeEntries[dateKey] || 0)
                                        );
                                      }, 0)
                                    );
                                  }, 0)
                                  .toFixed(1)}
                              </span>
                            </td>
                            {!isSubmitted && <td className="px-2 py-3" />}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Monthly Summary ── */}
                <div className="rounded-2xl border border-indigo-100/60 bg-white shadow-lg shadow-indigo-100/20 overflow-hidden mt-4">
                  <div className="px-5 py-3 bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100/60">
                    <h3 className="text-sm font-bold text-indigo-800">
                      Monthly Summary
                    </h3>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="rounded-xl bg-indigo-50/80 p-4 border border-indigo-100">
                        <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide">
                          Total Hours
                        </p>
                        <p className="text-2xl font-bold text-indigo-800 mt-1">
                          {displayTotalHours.toFixed(1)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-50/80 p-4 border border-emerald-100">
                        <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">
                          Required Hours
                        </p>
                        <p className="text-2xl font-bold text-emerald-800 mt-1">
                          {totalTimeAllocated}h
                        </p>
                      </div>
                      <div className="rounded-xl bg-amber-50/80 p-4 border border-amber-100">
                        <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide">
                          Utilization
                        </p>
                        <p className="text-2xl font-bold text-amber-800 mt-1">
                          {utilPercent.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Approval Tracking Section (always visible when submitted) ── */}
                {currentSubmission && currentSubmission.status !== "draft" && (
                  <div className="rounded-2xl border border-indigo-100/60 bg-white shadow-lg shadow-indigo-100/20 overflow-hidden mt-4">
                    <div className="px-5 py-3 bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100/60">
                      <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" /> Approval Status
                      </h3>
                    </div>
                    <div className="p-5 space-y-5">
                      {/* ── Approval Progress Bar ── */}
                      {(() => {
                        const levels = [
                          "Facility In-Charge",
                          "County Rep",
                          "Program HR",
                        ];
                        const approvedCount =
                          currentSubmission.status === "facility_approved"
                            ? 1
                            : currentSubmission.status === "county_approved"
                              ? 2
                              : currentSubmission.status === "approved"
                                ? 3
                                : 0;
                        const pct = Math.round((approvedCount / 3) * 100);
                        return (
                          <div className="mb-2">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-gray-600">
                                Approval Progress
                              </span>
                              <span className="text-xs font-bold text-indigo-700">
                                {approvedCount}/3 ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-teal-500 to-green-500 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                              <span
                                className={
                                  approvedCount >= 1
                                    ? "text-indigo-600 font-semibold"
                                    : ""
                                }
                              >
                                Facility
                              </span>
                              <span
                                className={
                                  approvedCount >= 2
                                    ? "text-teal-600 font-semibold"
                                    : ""
                                }
                              >
                                County
                              </span>
                              <span
                                className={
                                  approvedCount >= 3
                                    ? "text-green-600 font-semibold"
                                    : ""
                                }
                              >
                                HR
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Supervisor (Facility In-Charge) Approval Row */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              Supervisor Name
                            </p>
                            <p className="text-sm font-bold text-gray-900">
                              {currentSubmission.supervisorName ||
                                "Facility In-Charge"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              Designation
                            </p>
                            <p className="text-sm font-semibold text-gray-700">
                              {currentSubmission.supervisorDesignation ||
                                "Facility In-Charge"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              Comments
                            </p>
                            <p className="text-sm text-gray-700">
                              {currentSubmission.reviewFeedback || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              Status
                            </p>
                            {currentSubmission.status === "facility_approved" ||
                            currentSubmission.status === "county_approved" ||
                            currentSubmission.status === "approved" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-bold border border-green-200">
                                <Check className="h-3 w-3" /> APPROVED
                              </span>
                            ) : currentSubmission.status === "returned" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-800 px-3 py-1 text-xs font-bold border border-red-200">
                                <X className="h-3 w-3" /> RETURNED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold border border-amber-200">
                                <Clock className="h-3 w-3" /> PENDING
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* County Rep Approval Row */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              County Rep Name
                            </p>
                            <p className="text-sm font-bold text-gray-900">
                              {currentSubmission.countyRepName ||
                                "County Representative"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              Designation
                            </p>
                            <p className="text-sm font-semibold text-gray-700">
                              County Representative
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              Comments
                            </p>
                            <p className="text-sm text-gray-700">
                              {currentSubmission.countyRepComment || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              Status
                            </p>
                            {currentSubmission.status === "county_approved" ||
                            currentSubmission.status === "approved" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-bold border border-green-200">
                                <Check className="h-3 w-3" /> APPROVED
                              </span>
                            ) : currentSubmission.status === "returned" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-800 px-3 py-1 text-xs font-bold border border-red-200">
                                <X className="h-3 w-3" /> RETURNED
                              </span>
                            ) : currentSubmission.status ===
                              "facility_approved" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-800 px-3 py-1 text-xs font-bold border border-blue-200">
                                <Clock className="h-3 w-3" /> AWAITING COUNTY
                                REP
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold border border-amber-200">
                                <Clock className="h-3 w-3" /> PENDING
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* HR Officer Approval Row */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              HR Officer Name
                            </p>
                            <p className="text-sm font-bold text-gray-900">
                              {currentSubmission.hrName || "Program HR"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              Designation
                            </p>
                            <p className="text-sm font-semibold text-gray-700">
                              Human Resource Officer
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              Comments
                            </p>
                            <p className="text-sm text-gray-700">
                              {currentSubmission.hrComment || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              Status
                            </p>
                            {currentSubmission.status === "approved" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-bold border border-green-200">
                                <Check className="h-3 w-3" /> APPROVED
                              </span>
                            ) : currentSubmission.status ===
                              "county_approved" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-800 px-3 py-1 text-xs font-bold border border-blue-200">
                                <Clock className="h-3 w-3" /> AWAITING HR
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold border border-amber-200">
                                <Clock className="h-3 w-3" /> PENDING
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Download Button */}
                      <div className="px-0 pb-2">
                        <button
                          onClick={() =>
                            downloadTimesheetPDF(currentSubmission)
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                        >
                          <Download className="h-4 w-4" /> Download Timesheet
                          PDF
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* TAB 2: EMPLOYEE LEAVE REQUEST                       */}
        {/* ════════════════════════════════════════════════════ */}
        {activeTab === "leave" && (
          <div>
            {/* ── Submitted Leave Requests ── */}
            {allLeaves.length > 0 && (
              <div className="rounded-2xl border border-indigo-100/60 bg-white shadow-lg shadow-indigo-100/20 overflow-hidden mb-6">
                <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100/60">
                  <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" /> My Leave Requests
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Leave Type
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                          Hours
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                          Start Date
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                          Reporting Date
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allLeaves.map((leave) => (
                        <tr
                          key={leave.id}
                          className="border-b border-gray-100 hover:bg-indigo-50/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-gray-900">
                              {leaveTypeLabel(leave.leaveType)}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-bold text-indigo-700">
                              {leave.hoursTaken}h
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-700">
                            {leave.startDate
                              ? new Date(
                                  leave.startDate + "T00:00:00",
                                ).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-700">
                            {leave.reportingDate
                              ? new Date(
                                  leave.reportingDate + "T00:00:00",
                                ).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${leaveStatusColor(leave.status)}`}
                            >
                              {statusLabel(leave.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {leave.status === "returned" && (
                              <button
                                onClick={() => handleDeleteLeave(leave.id)}
                                className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── New Leave Request Form ── */}
            <div className="rounded-2xl border border-indigo-100/60 bg-white/90 backdrop-blur-sm shadow-lg shadow-indigo-100/30 overflow-hidden">
              <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Umbrella className="h-5 w-5" /> EMPLOYEE LEAVE REQUEST
                </h2>
              </div>
              <div className="p-6">
                {/* Leave Type Table */}
                <div className="overflow-x-auto mb-6">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-100 to-gray-50">
                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase w-[35%]">
                          TYPE OF LEAVE REQUEST
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase w-[15%]">
                          Tick
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase w-[20%]">
                          HOURS TAKEN (=8xNo. of Days)
                        </th>
                        <th
                          className="border border-gray-300 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase w-[30%]"
                          colSpan={2}
                        >
                          LEAVE DATES
                        </th>
                      </tr>
                      <tr className="bg-gradient-to-r from-gray-50 to-white">
                        <th colSpan={3} />
                        <th className="border border-gray-300 px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">
                          Start Date
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">
                          Reporting Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {LEAVE_TYPES.map((lt) => {
                        const isSelected = selectedLeaveType === lt.value;
                        return (
                          <tr
                            key={lt.value}
                            onClick={() => {
                              setSelectedLeaveType(lt.value);
                              if (!isSelected) setLeaveDays(1);
                            }}
                            className={`cursor-pointer transition-colors ${isSelected ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                          >
                            <td
                              className={`border border-gray-200 px-4 py-3 text-sm font-medium ${isSelected ? "text-indigo-700 font-semibold" : "text-gray-800"}`}
                            >
                              {lt.label}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center">
                              <div
                                className={`mx-auto flex h-6 w-6 items-center justify-center rounded border-2 transition-colors ${isSelected ? "border-indigo-600 bg-indigo-600" : "border-gray-300"}`}
                              >
                                {isSelected && (
                                  <Check className="h-4 w-4 text-white" />
                                )}
                              </div>
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center">
                              {isSelected ? (
                                <div className="flex items-center justify-center gap-2">
                                  <input
                                    type="number"
                                    min={1}
                                    max={90}
                                    value={leaveDays}
                                    onChange={(e) =>
                                      setLeaveDays(
                                        Math.max(
                                          1,
                                          parseInt(e.target.value) || 1,
                                        ),
                                      )
                                    }
                                    className="w-16 rounded border border-indigo-200 px-2 py-1 text-sm font-bold text-center text-indigo-700 focus:border-indigo-400 focus:outline-none"
                                  />
                                  <span className="text-xs text-gray-500">
                                    days
                                  </span>
                                  <span className="text-sm font-bold text-indigo-700">
                                    = {leaveDays * 8}h
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center">
                              {isSelected ? (
                                <input
                                  type="date"
                                  value={leaveStartDate}
                                  onChange={(e) =>
                                    setLeaveStartDate(e.target.value)
                                  }
                                  className="w-full max-w-[140px] rounded border border-indigo-200 px-2 py-1 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none"
                                />
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center">
                              {isSelected ? (
                                <input
                                  type="date"
                                  value={leaveReportingDate}
                                  readOnly
                                  title="Auto-calculated from start date + leave days"
                                  className="w-full max-w-[140px] rounded border border-indigo-200 bg-indigo-50/50 px-2 py-1 text-sm text-gray-700 cursor-not-allowed"
                                />
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Employee Signature */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Employee Signature
                    </p>
                    <input
                      type="text"
                      value={leaveSignature}
                      onChange={(e) => setLeaveSignature(e.target.value)}
                      placeholder="Type your full name..."
                      className="w-full border-b-2 border-gray-300 px-2 py-2 text-lg font-['cursive'] text-indigo-700 placeholder-gray-300 focus:border-indigo-400 focus:outline-none bg-transparent"
                      style={{ fontFamily: "'Brush Script MT', cursive" }}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Date
                    </p>
                    <p className="border-b-2 border-gray-300 px-2 py-2 text-sm font-medium text-gray-900">
                      {formatDate(now)}
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmitLeave}
                    disabled={
                      !selectedLeaveType ||
                      !leaveStartDate ||
                      !leaveReportingDate ||
                      !leaveSignature.trim()
                    }
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:from-green-700 hover:to-emerald-700 transition-all shadow-md shadow-green-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" /> Submit Leave Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Sign Modal ── */}
      {showSignModal && currentSubmission && (
        <SigningModal
          totalHours={displayTotalHours}
          totalAllocated={totalTimeAllocated}
          onSign={() => handleSignSubmit()}
          onClose={() => setShowSignModal(false)}
        />
      )}
    </div>
  );
}
