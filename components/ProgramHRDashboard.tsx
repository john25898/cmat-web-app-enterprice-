"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LogOut,
  Check,
  RotateCcw,
  X,
  Search,
  Clock,
  ShieldCheck,
  Umbrella,
  BarChart3,
  Download,
} from "lucide-react";
import { downloadTimesheetPDF } from "@/lib/timesheetDownload";
import type {
  TimesheetSubmission,
  LeaveRequest,
} from "./StaffTimesheetDashboard";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProgramHRDashboardProps {
  userEmail: string;
  onLogout: () => void;
}

const STORAGE_KEY = "chak-timesheet-submissions";
const LEAVE_KEY = "chak-leave-requests";

function loadAll(): TimesheetSubmission[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAll(subs: TimesheetSubmission[]) {
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

function statusBadgeColor(status: string) {
  switch (status) {
    case "facility_approved":
      return "bg-indigo-100 text-indigo-800";
    case "county_approved":
      return "bg-teal-100 text-teal-800";
    case "approved":
      return "bg-green-100 text-green-800";
    case "returned":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function statusLabel(status: string): string {
  switch (status) {
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

// ─── Detail View Modal ──────────────────────────────────────────────────────

function HRDetailView({
  submission,
  onClose,
  onApprove,
  onReturn,
}: {
  submission: TimesheetSubmission;
  onClose: () => void;
  onApprove?: () => void;
  onReturn?: (feedback: string) => void;
}) {
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [feedback, setFeedback] = useState("");

  const displayStatus =
    submission.status === "county_approved"
      ? "County Approved"
      : submission.status === "approved"
        ? "Approved"
        : "Returned";

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function getDayOfWeek(year: number, month: number, day: number): number {
    return new Date(year, month, day).getDay();
  }
  function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }
  const dailyEntries = submission.dailyEntries ?? {};
  const activities = submission.activities ?? [];
  const computedDailyTotal = Object.values(dailyEntries).reduce(
    (s, h) => s + (h || 0),
    0,
  );
  const computedActivityTotal = activities.reduce((sum, act) => {
    return (
      sum + Object.values(act.timeEntries).reduce((s, h) => s + (h || 0), 0)
    );
  }, 0);
  // Simple display
  const displayTotalHours =
    computedActivityTotal > 0
      ? computedActivityTotal
      : computedDailyTotal > 0
        ? computedDailyTotal
        : (submission.totalHoursWorked ?? submission.totalHours ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-lg">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-emerald-50 to-white rounded-t-lg">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {submission.staffName}
            </h2>
            <p className="text-xs text-gray-500">
              {submission.staffEmail} &middot; {MONTHS[submission.month]}{" "}
              {submission.year}
              <span
                className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeColor(submission.status)}`}
              >
                {displayStatus}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadTimesheetPDF(submission)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-lg bg-gray-50 p-3 border border-gray-100">
              <p className="text-xs font-medium text-gray-500">
                Total Hours Worked
              </p>
              <p className="text-xl font-bold text-gray-900">
                {displayTotalHours.toFixed(1)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 border border-gray-100">
              <p className="text-xs font-medium text-gray-500">Status</p>
              <p className="text-xl font-bold text-gray-900">{displayStatus}</p>
            </div>
          </div>

          {/* Confirmation text from DOCX */}
          <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4 mb-4">
            <p className="text-sm text-indigo-800 italic leading-relaxed">
              "I confirm that the details above are correct, and the work
              deliverables/output have been met."
            </p>
          </div>

          {/* Staff Info */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 mb-6">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Staff Information
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400">Full Name</p>
                <p className="text-sm font-medium text-gray-900">
                  {submission.staffFullName || submission.staffName}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Facility</p>
                <p className="text-sm font-medium text-gray-900">
                  {submission.facility}
                </p>
              </div>
              {submission.staffCounty && (
                <div>
                  <p className="text-xs text-gray-400">County</p>
                  <p className="text-sm font-medium text-gray-900">
                    {submission.staffCounty}
                  </p>
                </div>
              )}
              {submission.staffJobTitle && (
                <div>
                  <p className="text-xs text-gray-400">Job Title</p>
                  <p className="text-sm font-medium text-gray-900">
                    {submission.staffJobTitle}
                  </p>
                </div>
              )}
              {submission.staffTelephone && (
                <div>
                  <p className="text-xs text-gray-400">Telephone</p>
                  <p className="text-sm font-medium text-gray-900">
                    {submission.staffTelephone}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Activities Breakdown — per day */}
          {activities.length > 0 &&
            (() => {
              // Generate all days of the month for full month view
              const daysInMonth = getDaysInMonth(
                submission.year,
                submission.month,
              );
              const sortedDates = Array.from(
                { length: daysInMonth },
                (_, i) => {
                  const d = i + 1;
                  const monthStr = String(submission.month + 1).padStart(
                    2,
                    "0",
                  );
                  const dayStr = String(d).padStart(2, "0");
                  return `${submission.year}-${monthStr}-${dayStr}`;
                },
              );
              const fmt = (d: string) =>
                String(new Date(d + "T00:00:00").getDate());
              return (
                <div className="rounded-lg bg-white border border-gray-200 p-4 mb-6">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Daily Activities Breakdown
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-2 py-1.5 text-left font-semibold text-gray-600">
                            Project
                          </th>
                          <th className="px-2 py-1.5 text-left font-semibold text-gray-600">
                            Activity
                          </th>
                          {sortedDates.map((d) => (
                            <th
                              key={d}
                              className="px-2 py-1.5 text-center font-semibold text-gray-600 min-w-[52px]"
                            >
                              {fmt(d)}
                            </th>
                          ))}
                          <th className="px-2 py-1.5 text-center font-semibold text-gray-700">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {activities.map((act, idx) => {
                          const actTotal = Object.values(
                            act.timeEntries,
                          ).reduce((s, h) => s + (h || 0), 0);
                          return (
                            <tr
                              key={act.id}
                              className={`border-b border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                            >
                              <td className="px-2 py-2 text-sm font-medium text-gray-800">
                                {act.project}
                              </td>
                              <td className="px-2 py-2 text-sm text-gray-600">
                                {act.activity}
                              </td>
                              {sortedDates.map((d) => (
                                <td
                                  key={d}
                                  className="px-2 py-2 text-center text-sm text-gray-700"
                                >
                                  {act.timeEntries[d] != null
                                    ? act.timeEntries[d].toFixed(1)
                                    : "—"}
                                </td>
                              ))}
                              <td className="px-2 py-2 text-center text-sm font-bold text-indigo-700">
                                {actTotal.toFixed(1)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

          {/* Submitted/Review Info */}
          {submission.submittedAt && (
            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs text-blue-700">
                Submitted: {new Date(submission.submittedAt).toLocaleString()}
              </p>
            </div>
          )}
          {submission.reviewedBy && submission.status === "county_approved" && (
            <div className="mt-2 rounded-lg bg-indigo-50 border border-indigo-200 p-3">
              <p className="text-xs text-indigo-700">
                Pre-approved by: {submission.reviewedBy} (
                {submission.reviewedByEmail}) on{" "}
                {submission.reviewedAt
                  ? new Date(submission.reviewedAt).toLocaleString()
                  : "—"}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {submission.status === "county_approved" && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
            {!showReturnForm ? (
              <>
                <button
                  onClick={() => setShowReturnForm(true)}
                  className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Return to Facility
                </button>
                <button
                  onClick={onApprove}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 shadow-sm"
                >
                  <Check className="h-4 w-4" />
                  Final Approve
                </button>
              </>
            ) : (
              <div className="flex w-full flex-col gap-3">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe what needs to be revised..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowReturnForm(false);
                      setFeedback("");
                    }}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (feedback.trim()) onReturn?.(feedback.trim());
                    }}
                    disabled={!feedback.trim()}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Return to Facility In-Charge
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Approved badge */}
        {submission.status === "approved" && (
          <div className="flex shrink-0 items-center gap-2 border-t border-gray-100 px-6 py-4">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              Fully Approved by Program HR
            </span>
            {submission.reviewedAt && (
              <span className="text-xs text-gray-400">
                on {new Date(submission.reviewedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {submission.status === "returned" && (
          <div className="flex shrink-0 items-center gap-2 border-t border-gray-100 px-6 py-4">
            <RotateCcw className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">Returned</span>
            {submission.reviewFeedback && (
              <span className="text-xs text-gray-400">
                &mdash; {submission.reviewFeedback}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="h-4 w-4 text-gray-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ProgramHRDashboard({
  userEmail,
  onLogout,
}: ProgramHRDashboardProps) {
  const [submissions, setSubmissions] = useState<TimesheetSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSubmissionForDetail, setSelectedSubmissionForDetail] =
    useState<TimesheetSubmission | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"timesheet" | "leave">(
    "timesheet",
  );
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);

  const staffName = deriveName(userEmail);

  const refresh = useCallback(() => {
    const all = loadAll();
    // Show county-approved timesheets (awaiting HR approval) or those already HR-approved/returned
    const relevant = all.filter(
      (s) =>
        s.status === "county_approved" ||
        s.status === "approved" ||
        (s.status === "returned" && s.reviewedByEmail !== undefined),
    );
    relevant.sort(
      (a, b) =>
        new Date(b.reviewedAt || b.submittedAt || b.createdAt).getTime() -
        new Date(a.reviewedAt || a.submittedAt || a.createdAt).getTime(),
    );
    setSubmissions(relevant);
    // Load leave requests
    const allLeaves = loadAllLeaves();
    const relevantLeaves = allLeaves.filter(
      (l) =>
        l.status === "county_approved" ||
        l.status === "approved" ||
        (l.status === "returned" && l.reviewedByEmail !== undefined),
    );
    relevantLeaves.sort(
      (a, b) =>
        new Date(b.reviewedAt || b.submittedAt || b.createdAt || "").getTime() -
        new Date(a.reviewedAt || a.submittedAt || a.createdAt || "").getTime(),
    );
    setLeaveRequests(relevantLeaves);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const selectedSubmission = submissions.find((s) => s.id === selectedId);

  const filteredSubmissions = submissions.filter((s) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !s.staffName.toLowerCase().includes(q) &&
        !s.staffEmail.toLowerCase().includes(q) &&
        !s.facility.toLowerCase().includes(q)
      )
        return false;
    }
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterMonth !== "all") {
      const [y, m] = filterMonth.split("-").map(Number);
      if (s.year !== y || s.month !== m) return false;
    }
    return true;
  });

  const pendingCount = submissions.filter(
    (s) => s.status === "county_approved",
  ).length;

  const pendingLeaveCount = leaveRequests.filter(
    (l) => l.status === "county_approved",
  ).length;

  const handleApprove = (id: string) => {
    const all = loadAll();
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) return;
    all[idx].status = "approved";
    all[idx].reviewedAt = new Date().toISOString();
    all[idx].reviewFeedback = undefined;
    all[idx].reviewedBy = staffName;
    all[idx].reviewedByEmail = userEmail;
    saveAll(all);
    refresh();
    setToastMessage("✓ Timesheet fully approved by Program HR");
  };

  const handleReturnForRevision = (id: string, feedback: string) => {
    const all = loadAll();
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) return;
    all[idx].status = "returned";
    all[idx].reviewedAt = new Date().toISOString();
    all[idx].reviewFeedback = feedback;
    all[idx].reviewedBy = staffName;
    all[idx].reviewedByEmail = userEmail;
    saveAll(all);
    refresh();
    setSelectedId(null);
    setToastMessage(`Timesheet returned to County Rep for revision`);
  };

  const handleApproveLeave = (id: string) => {
    const all = loadAllLeaves();
    const idx = all.findIndex((l) => l.id === id);
    if (idx === -1) return;
    all[idx].status = "approved";
    all[idx].reviewedAt = new Date().toISOString();
    all[idx].reviewedBy = staffName;
    all[idx].reviewedByEmail = userEmail;
    all[idx].reviewFeedback = undefined;
    saveAllLeaves(all);
    refresh();
    setToastMessage("✓ Leave request fully approved by Program HR");
  };

  const handleReturnLeave = (id: string, feedback: string) => {
    const all = loadAllLeaves();
    const idx = all.findIndex((l) => l.id === id);
    if (idx === -1) return;
    all[idx].status = "returned";
    all[idx].reviewedAt = new Date().toISOString();
    all[idx].reviewFeedback = feedback;
    all[idx].reviewedBy = staffName;
    all[idx].reviewedByEmail = userEmail;
    saveAllLeaves(all);
    refresh();
    setSelectedLeaveId(null);
    setToastMessage("Leave request returned");
  };

  // Unique month options
  const monthOptions = [
    ...new Set(submissions.map((s) => `${s.year}-${s.month}`)),
  ].sort();

  // ── Render ──

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-sm">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Program HR Dashboard
              </h1>
              <p className="text-sm text-gray-500">{userEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                <span className="text-xs font-medium text-amber-700">
                  {pendingCount} pending approval
                </span>
              </div>
            )}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="border-b border-gray-200 bg-emerald-50 px-8 py-3">
          <p className="text-sm text-emerald-700">{toastMessage}</p>
        </div>
      )}

      {/* Tab Bar */}
      <div className="border-b border-gray-200 bg-white px-8">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab("timesheet")}
            className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "timesheet"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Timesheet Approvals
            {pendingCount > 0 && (
              <span className="ml-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("leave")}
            className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "leave"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Umbrella className="h-4 w-4" />
            Leave Approvals
            {pendingLeaveCount > 0 && (
              <span className="ml-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {pendingLeaveCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Table */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {activeTab === "timesheet" ? (
              <>
                {/* Header & Filters */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Final Timesheet Approvals
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Review and final-approve timesheets pre-approved by County
                      Reps
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
                    >
                      <option value="all">All Months</option>
                      {monthOptions.map((mo) => {
                        const [y, m] = mo.split("-").map(Number);
                        return (
                          <option key={mo} value={mo}>
                            {MONTHS[m]} {y}
                          </option>
                        );
                      })}
                    </select>
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                      {[
                        { value: "all", label: "All" },
                        { value: "county_approved", label: "Pending" },
                        { value: "approved", label: "Approved" },
                        { value: "returned", label: "Returned" },
                      ].map((tab) => (
                        <button
                          key={tab.value}
                          onClick={() => setFilterStatus(tab.value)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            filterStatus === tab.value
                              ? "bg-white text-emerald-700 shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mb-4 max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, facility..."
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <p className="text-gray-500">Loading timesheets...</p>
                  </div>
                ) : filteredSubmissions.length === 0 ? (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-20">
                    <div className="text-center">
                      <ShieldCheck className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                      <p className="text-gray-500">
                        {searchQuery ||
                        filterStatus !== "all" ||
                        filterMonth !== "all"
                          ? "No matching timesheets found"
                          : "No timesheets pending HR approval. Facility-approved timesheets will appear here."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                            Staff Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                            Facility
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                            Period
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                            Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                            Approved By
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubmissions.map((row) => (
                          <tr
                            key={row.id}
                            onClick={() => {
                              setSelectedId(row.id);
                              setSelectedSubmissionForDetail(row);
                              setShowDetailView(true);
                            }}
                            className={`cursor-pointer border-b border-gray-200 transition-colors hover:bg-emerald-50 ${
                              selectedId === row.id ? "bg-emerald-50" : ""
                            }`}
                          >
                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-900">
                                {row.staffName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {row.staffEmail}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {row.facility}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {MONTHS[row.month]} {row.year}
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-gray-900">
                                {(
                                  row.totalHoursWorked ??
                                  row.totalHours ??
                                  0
                                ).toFixed(1)}
                                h
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {row.reviewedBy || "—"}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeColor(row.status)}`}
                              >
                                {statusLabel(row.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* ── Leave Request Table ── */}
                {leaveRequests.length === 0 ? (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-20">
                    <div className="text-center">
                      <Umbrella className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                      <p className="text-gray-500">
                        No leave requests pending HR approval
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                            Staff Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                            Leave Type
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">
                            Hours
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">
                            Start Date
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">
                            Reporting Date
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveRequests.map((leave) => (
                          <tr
                            key={leave.id}
                            onClick={() => {
                              setSelectedLeaveId(leave.id);
                            }}
                            className={`cursor-pointer border-b border-gray-200 transition-colors hover:bg-emerald-50 ${selectedLeaveId === leave.id ? "bg-emerald-50" : ""}`}
                          >
                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-900">
                                {leave.staffName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {leave.staffEmail}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {leave.leaveType
                                .replace("_", " ")
                                .replace(/\b\w/g, (c) => c.toUpperCase())}
                            </td>
                            <td className="px-6 py-4 text-center text-sm font-semibold text-emerald-700">
                              {leave.hoursTaken}h
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-700">
                              {leave.startDate
                                ? new Date(
                                    leave.startDate + "T00:00:00",
                                  ).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-700">
                              {leave.reportingDate
                                ? new Date(
                                    leave.reportingDate + "T00:00:00",
                                  ).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeColor(leave.status)}`}
                              >
                                {statusLabel(leave.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Timesheet Review Panel */}
        {activeTab === "timesheet" && selectedSubmission && (
          <div className="w-80 border-l border-gray-200 bg-white p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900">
              Final Review
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedSubmission.staffName}
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Facility
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedSubmission.facility}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Period
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {MONTHS[selectedSubmission.month]} {selectedSubmission.year}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Total Hours
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {(
                    selectedSubmission.totalHoursWorked ??
                    selectedSubmission.totalHours ??
                    0
                  ).toFixed(1)}
                  h
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Pre-approved By
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedSubmission.reviewedBy || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </p>
                <span
                  className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeColor(selectedSubmission.status)}`}
                >
                  {statusLabel(selectedSubmission.status)}
                </span>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => downloadTimesheetPDF(selectedSubmission)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" /> Download PDF
                </button>
              </div>
              {selectedSubmission.status === "county_approved" && (
                <div className="space-y-2 pt-4">
                  <button
                    onClick={() => handleApprove(selectedSubmission.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition-colors hover:bg-emerald-700 shadow-sm"
                  >
                    <Check className="h-4 w-4" /> Final Approve
                  </button>
                  <button
                    onClick={() => setShowDetailView(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <RotateCcw className="h-4 w-4" /> Return for Revision
                  </button>
                </div>
              )}
              {selectedSubmission.status === "approved" && (
                <div className="pt-4">
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                    <p className="text-xs font-medium text-green-700">
                      ✓ Fully Approved
                    </p>
                    {selectedSubmission.reviewedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        {new Date(
                          selectedSubmission.reviewedAt,
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leave Review Panel */}
        {activeTab === "leave" &&
          selectedLeaveId &&
          (() => {
            const leave = leaveRequests.find((l) => l.id === selectedLeaveId);
            if (!leave) return null;
            return (
              <div className="w-80 border-l border-gray-200 bg-white p-6 overflow-y-auto">
                <h3 className="text-lg font-semibold text-gray-900">
                  Final Leave Review
                </h3>
                <p className="mt-1 text-sm text-gray-500">{leave.staffName}</p>
                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Leave Type
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {leave.leaveType
                        .replace("_", " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Hours Taken
                    </p>
                    <p className="mt-1 text-lg font-bold text-emerald-700">
                      {leave.hoursTaken}h
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Start Date
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {leave.startDate
                        ? new Date(
                            leave.startDate + "T00:00:00",
                          ).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Reporting Date
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {leave.reportingDate
                        ? new Date(
                            leave.reportingDate + "T00:00:00",
                          ).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Pre-approved By
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {leave.reviewedBy || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Status
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeColor(leave.status)}`}
                    >
                      {statusLabel(leave.status)}
                    </span>
                  </div>
                  {leave.status === "county_approved" && (
                    <div className="space-y-2 pt-4">
                      <button
                        onClick={() => handleApproveLeave(leave.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition-colors hover:bg-emerald-700 shadow-sm"
                      >
                        <Check className="h-4 w-4" /> Final Approve Leave
                      </button>
                      <button
                        onClick={() => {
                          const fb = prompt("Enter feedback for return:");
                          if (fb?.trim())
                            handleReturnLeave(leave.id, fb.trim());
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        <RotateCcw className="h-4 w-4" /> Return for Revision
                      </button>
                    </div>
                  )}
                  {leave.status === "approved" && (
                    <div className="pt-4">
                      <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                        <p className="text-xs font-medium text-green-700">
                          ✓ Fully Approved
                        </p>
                        {leave.reviewedAt && (
                          <p className="text-xs text-green-600 mt-1">
                            {new Date(leave.reviewedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
      </div>

      {/* Detail View Modal */}
      {showDetailView && selectedSubmissionForDetail && (
        <HRDetailView
          submission={selectedSubmissionForDetail}
          onClose={() => {
            setShowDetailView(false);
            setSelectedSubmissionForDetail(null);
          }}
          onApprove={
            selectedSubmissionForDetail.status === "county_approved"
              ? () => {
                  handleApprove(selectedSubmissionForDetail.id);
                  setShowDetailView(false);
                  setSelectedSubmissionForDetail(null);
                }
              : undefined
          }
          onReturn={
            selectedSubmissionForDetail.status === "county_approved"
              ? (feedback: string) => {
                  handleReturnForRevision(
                    selectedSubmissionForDetail.id,
                    feedback,
                  );
                  setShowDetailView(false);
                  setSelectedSubmissionForDetail(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
