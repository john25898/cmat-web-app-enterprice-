"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LogOut,
  Check,
  RotateCcw,
  Download,
  X,
  FileText,
  FileSpreadsheet,
  Eye,
  Clock,
  ChevronDown,
  Search,
  ShieldCheck,
  Umbrella,
} from "lucide-react";
import { downloadTimesheetPDF } from "@/lib/timesheetDownload";
import { exportTimesheetReport } from "@/lib/utils";
import type { AuthUser } from "@/lib/auth";
import TimesheetReadOnlyView from "./TimesheetReadOnlyView";
import type {
  TimesheetSubmission,
  LeaveRequest,
} from "./StaffTimesheetDashboard";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CountyRepDashboardProps {
  user: AuthUser;
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
      return "HR Approved";
    case "returned":
      return "Returned";
    default:
      return status;
  }
}

// ─── Review Dialog ──────────────────────────────────────────────────────────

function CountyReviewDialog({
  staffName,
  period,
  onSubmit,
  onClose,
}: {
  staffName: string;
  period: string;
  onSubmit: (feedback: string) => void;
  onClose: () => void;
}) {
  const [feedback, setFeedback] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Return for Revision
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600">
            Provide guidance for{" "}
            <span className="font-medium">{staffName}</span> to revise their
            timesheet ({period}).
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Enter your feedback and guidance notes here..."
            rows={4}
            className="mt-3 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (feedback.trim()) onSubmit(feedback.trim());
            }}
            disabled={!feedback.trim()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Return to Staff
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail View Modal ──────────────────────────────────────────────────────

// ─── Detail View Modal ──────────────────────────────────────────────────────

function CountyTimesheetDetailView({
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
  return (
    <TimesheetReadOnlyView
      submission={submission}
      onClose={onClose}
      role="county_rep"
      onApprove={onApprove}
      onReturn={onReturn}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CountyRepDashboard({
  user,
  onLogout,
}: CountyRepDashboardProps) {
  const userEmail = user.email;
  const [activeTab, setActiveTab] = useState<"timesheet" | "leave">(
    "timesheet",
  );
  const [submissions, setSubmissions] = useState<TimesheetSubmission[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSubmissionForDetail, setSelectedSubmissionForDetail] =
    useState<TimesheetSubmission | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const staffName = user.name || deriveName(userEmail);

  const refresh = useCallback(() => {
    const all = loadAll();
    // Show facility-approved (awaiting county approval) and county-approved and returned
    let relevant = all.filter(
      (s) =>
        s.status === "facility_approved" ||
        s.status === "county_approved" ||
        (s.status === "returned" && s.reviewedByEmail !== undefined),
    );
    // Scope to this rep's county (legacy rows without a county still show)
    if (user.county) {
      relevant = relevant.filter(
        (s) => !s.staffCounty || s.staffCounty === user.county,
      );
    }
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
        l.status === "facility_approved" ||
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
  }, [user.county]);

  // Load data on mount and poll every 15s
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
    (s) => s.status === "facility_approved",
  ).length;

  // ── Selection Helpers ──

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (
        submissions.find((s) => s.id === id)?.status === "facility_approved"
      )
        next.add(id);
      return next;
    });
  };

  const toggleSelectAllForFacility = (facility: string) => {
    const facilitySubs = filteredSubmissions.filter(
      (s) => s.facility === facility && s.status === "facility_approved",
    );
    const allSelected = facilitySubs.every((s) => selectedIds.has(s.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        facilitySubs.forEach((s) => next.delete(s.id));
      } else {
        facilitySubs.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const selectedApprovableCount = filteredSubmissions.filter(
    (s) => selectedIds.has(s.id) && s.status === "facility_approved",
  ).length;

  const handleBulkApprove = () => {
    const all = loadAll();
    const toApprove = filteredSubmissions.filter(
      (s) => selectedIds.has(s.id) && s.status === "facility_approved",
    );
    toApprove.forEach((sub) => {
      const idx = all.findIndex((a) => a.id === sub.id);
      if (idx !== -1) {
        all[idx].status = "county_approved";
        all[idx].countyRepName = staffName;
        all[idx].countyRepDate = new Date().toISOString();
        all[idx].countyRepSign = staffName;
        all[idx].countyRepComment = undefined;
      }
    });
    saveAll(all);
    refresh();
    setSelectedIds(new Set());
    setToastMessage(
      `✓ ${toApprove.length} timesheet(s) approved — forwarded to Program HR`,
    );
  };

  const handleApprove = (id: string) => {
    const all = loadAll();
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) return;
    all[idx].status = "county_approved";
    all[idx].countyRepName = staffName;
    all[idx].countyRepDate = new Date().toISOString();
    all[idx].countyRepSign = staffName;
    all[idx].countyRepComment = undefined;
    // Keep the existing review info for facility in-charge
    saveAll(all);
    refresh();
    setToastMessage("✓ Timesheet approved — forwarded to Program HR");
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
    setShowReviewDialog(false);
    setToastMessage(`Timesheet returned to ${all[idx].staffName}`);
  };

  // ── Leave Request Handlers ──

  const handleApproveLeave = (leaveId: string) => {
    const allLeaves = loadAllLeaves();
    const idx = allLeaves.findIndex((l) => l.id === leaveId);
    if (idx === -1) return;
    allLeaves[idx].status = "approved";
    allLeaves[idx].reviewedAt = new Date().toISOString();
    allLeaves[idx].reviewedBy = staffName;
    allLeaves[idx].reviewedByEmail = userEmail;
    saveAllLeaves(allLeaves);
    refresh();
    setToastMessage("✓ Leave request approved — forwarded to Program HR");
  };

  const handleReturnLeave = (leaveId: string, feedback: string) => {
    const allLeaves = loadAllLeaves();
    const idx = allLeaves.findIndex((l) => l.id === leaveId);
    if (idx === -1) return;
    allLeaves[idx].status = "returned";
    allLeaves[idx].reviewedAt = new Date().toISOString();
    allLeaves[idx].reviewFeedback = feedback;
    allLeaves[idx].reviewedBy = staffName;
    allLeaves[idx].reviewedByEmail = userEmail;
    saveAllLeaves(allLeaves);
    refresh();
    setSelectedLeaveId(null);
    setToastMessage("✓ Leave request returned to staff");
  };

  // Unique month options from submissions
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-700 shadow-sm">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                County Rep Dashboard
              </h1>
              <p className="text-sm text-gray-500">{userEmail}</p>
            </div>
          </div>
          {/* Tab Bar */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("timesheet")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "timesheet"
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-gray-600 hover:text-teal-600"
              }`}
            >
              <Clock className="inline h-4 w-4 mr-1.5" />
              Timesheets
            </button>
            <button
              onClick={() => setActiveTab("leave")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "leave"
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-gray-600 hover:text-teal-600"
              }`}
            >
              <FileSpreadsheet className="inline h-4 w-4 mr-1.5" />
              Leave Requests
              {leaveRequests.filter((l) => l.status === "facility_approved")
                .length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full min-w-[18px]">
                  {
                    leaveRequests.filter(
                      (l) => l.status === "facility_approved",
                    ).length
                  }
                </span>
              )}
            </button>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="border-b border-gray-200 bg-teal-50 px-8 py-3">
          <p className="text-sm text-teal-700">{toastMessage}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Table */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Header & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              {activeTab === "timesheet" ? (
                <>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      County-level Timesheet Approvals
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Review and approve timesheets forwarded by Facility
                      In-Charges
                    </p>
                    {pendingCount > 0 && (
                      <p className="mt-1 text-sm font-medium text-teal-600">
                        {pendingCount} pending approval
                      </p>
                    )}
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
                        { value: "facility_approved", label: "Pending" },
                        { value: "county_approved", label: "Approved" },
                        { value: "returned", label: "Returned" },
                      ].map((tab) => (
                        <button
                          key={tab.value}
                          onClick={() => setFilterStatus(tab.value)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            filterStatus === tab.value
                              ? "bg-white text-teal-700 shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      County Leave Requests
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Review and approve leave requests from your facilities
                    </p>
                  </div>
                  <div />
                </>
              )}
            </div>

            {activeTab === "timesheet" ? (
              <>
                <div className="relative mb-4 max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, facility..."
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
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
                          : "No timesheets awaiting county review. Facility-approved timesheets will appear here."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Bulk Approve Bar */}
                    {selectedApprovableCount > 0 && (
                      <div className="mb-4 flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50 px-5 py-3">
                        <p className="text-sm font-medium text-teal-800">
                          {selectedApprovableCount} timesheet(s) selected
                        </p>
                        <button
                          onClick={handleBulkApprove}
                          className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 shadow-sm"
                        >
                          <Check className="h-4 w-4" />
                          Bulk Approve ({selectedApprovableCount})
                        </button>
                      </div>
                    )}

                    {/* Group submissions by facility */}
                    {(() => {
                      const grouped: Record<string, TimesheetSubmission[]> = {};
                      filteredSubmissions.forEach((s) => {
                        const f = s.facility || "Unknown Facility";
                        if (!grouped[f]) grouped[f] = [];
                        grouped[f].push(s);
                      });

                      return Object.entries(grouped).map(([facility, subs]) => (
                        <div
                          key={facility}
                          className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white"
                        >
                          {/* Facility Group Header */}
                          <div className="flex items-center justify-between bg-gradient-to-r from-teal-50 to-white px-5 py-3 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                              {subs.some(
                                (s) => s.status === "facility_approved",
                              ) && (
                                <input
                                  type="checkbox"
                                  checked={subs
                                    .filter(
                                      (s) => s.status === "facility_approved",
                                    )
                                    .every((s) => selectedIds.has(s.id))}
                                  onChange={() =>
                                    toggleSelectAllForFacility(facility)
                                  }
                                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                              )}
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {facility}
                                </h3>
                                <p className="text-xs text-gray-500">
                                  {subs.length} submission(s)
                                  {subs[0]?.reviewedBy && (
                                    <>
                                      {" "}
                                      &middot; In-Charge:{" "}
                                      <span className="font-medium text-indigo-600">
                                        {subs[0].reviewedBy}
                                      </span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                subs.filter(
                                  (s) => s.status === "facility_approved",
                                ).length > 0
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-teal-100 text-teal-800"
                              }`}
                            >
                              {subs.filter(
                                (s) => s.status === "facility_approved",
                              ).length > 0
                                ? `${subs.filter((s) => s.status === "facility_approved").length} pending`
                                : "All reviewed"}
                            </span>
                          </div>

                          {/* Submissions Table for this Facility */}
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-100 bg-gray-50/80">
                                <th className="w-10 px-2 py-3"></th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                  Staff
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                  In-Charge
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                  Period
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                  Hours
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {subs.map((sub) => {
                                const totalHours =
                                  (sub.activities ?? []).reduce(
                                    (sum, act) =>
                                      sum +
                                      Object.values(act.timeEntries).reduce(
                                        (s, h) => s + (h || 0),
                                        0,
                                      ),
                                    0,
                                  ) ||
                                  Object.values(sub.dailyEntries ?? {}).reduce(
                                    (s, h) => s + (h || 0),
                                    0,
                                  ) ||
                                  sub.totalHoursWorked ||
                                  0;

                                const isChecked = selectedIds.has(sub.id);
                                const isSelectable =
                                  sub.status === "facility_approved";

                                return (
                                  <tr
                                    key={sub.id}
                                    className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                                      selectedId === sub.id ? "bg-teal-50" : ""
                                    } ${isChecked ? "bg-teal-50/60" : ""}`}
                                  >
                                    {/* Checkbox */}
                                    <td className="px-2 py-4 text-center">
                                      {isSelectable && (
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => toggleSelect(sub.id)}
                                          className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                        />
                                      )}
                                    </td>
                                    {/* Staff */}
                                    <td className="px-4 py-4">
                                      <p className="text-sm font-medium text-gray-900">
                                        {sub.staffName}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        {sub.staffEmail}
                                      </p>
                                    </td>
                                    {/* In-Charge (source) */}
                                    <td className="px-4 py-4">
                                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                                        <ShieldCheck className="h-3 w-3" />
                                        {sub.reviewedBy || "N/A"}
                                      </span>
                                    </td>
                                    {/* Period */}
                                    <td className="px-4 py-4 text-sm text-gray-700">
                                      {MONTHS[sub.month]} {sub.year}
                                    </td>
                                    {/* Hours */}
                                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                                      {totalHours.toFixed(1)}h
                                    </td>
                                    {/* Status */}
                                    <td className="px-4 py-4">
                                      <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeColor(sub.status)}`}
                                      >
                                        {statusLabel(sub.status)}
                                      </span>
                                    </td>
                                    {/* Actions */}
                                    <td className="px-4 py-4 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => {
                                            setSelectedSubmissionForDetail(sub);
                                            setShowDetailView(true);
                                          }}
                                          className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                          View
                                        </button>
                                        <button
                                          onClick={() =>
                                            downloadTimesheetPDF(sub)
                                          }
                                          className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                          PDF
                                        </button>
                                        {sub.status === "facility_approved" && (
                                          <>
                                            <button
                                              onClick={() => {
                                                setSelectedSubmissionForDetail(
                                                  sub,
                                                );
                                                setShowDetailView(true);
                                              }}
                                              className="flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal-700 shadow-sm"
                                            >
                                              <Check className="h-3.5 w-3.5" />
                                              Approve
                                            </button>
                                            <button
                                              onClick={() => {
                                                setSelectedSubmissionForDetail(
                                                  sub,
                                                );
                                                setShowReviewDialog(true);
                                              }}
                                              className="flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                                            >
                                              <RotateCcw className="h-3.5 w-3.5" />
                                              Return
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ));
                    })()}
                  </>
                )}
              </>
            ) : (
              <>
                {/* Leave Requests Tab */}
                {leaveRequests.filter(
                  (l) =>
                    l.status === "facility_approved" ||
                    l.status === "approved" ||
                    l.status === "returned",
                ).length === 0 ? (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-20">
                    <div className="text-center">
                      <Umbrella className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                      <p className="text-gray-500">
                        No leave requests to review
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaveRequests
                      .filter(
                        (l) =>
                          l.status === "facility_approved" ||
                          l.status === "approved" ||
                          l.status === "returned",
                      )
                      .map((leave) => (
                        <div
                          key={leave.id}
                          className="rounded-lg border border-gray-200 bg-white p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {leave.staffName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {leave.leaveType.replace("_", " ")} &middot;{" "}
                                {leave.leaveDays} day(s) &middot; Starting{" "}
                                {new Date(leave.startDate).toLocaleDateString()}
                              </p>
                            </div>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeColor(leave.status)}`}
                            >
                              {statusLabel(leave.status)}
                            </span>
                          </div>
                          {leave.status === "facility_approved" && (
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() => handleApproveLeave(leave.id)}
                                className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal-700 shadow-sm"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Approve Leave
                              </button>
                              <button
                                onClick={() => {
                                  const fb = prompt(
                                    "Enter feedback for return:",
                                  );
                                  if (fb?.trim())
                                    handleReturnLeave(leave.id, fb.trim());
                                }}
                                className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Return
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedId && selectedSubmission && (
          <div className="w-96 shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
            {/* Panel Header */}
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  {selectedSubmission.staffName}
                </h3>
                <button
                  onClick={() => setSelectedId(null)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                <span className="text-xs text-gray-400">
                  {MONTHS[selectedSubmission.month]} {selectedSubmission.year}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeColor(selectedSubmission.status)}`}
                >
                  {statusLabel(selectedSubmission.status)}
                </span>
              </div>
            </div>

            {/* Panel Content */}
            <div className="px-5 py-4 space-y-4">
              {/* Staff Info */}
              <div className="rounded-lg bg-gray-50 p-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Staff Details
                </h4>
                <div className="space-y-1.5 text-sm">
                  <p>
                    <span className="text-gray-400">Name: </span>
                    <span className="font-medium text-gray-900">
                      {selectedSubmission.staffFullName ||
                        selectedSubmission.staffName}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-400">Facility: </span>
                    <span className="text-gray-900">
                      {selectedSubmission.facility}
                    </span>
                  </p>
                  {selectedSubmission.staffCounty && (
                    <p>
                      <span className="text-gray-400">County: </span>
                      <span className="text-gray-900">
                        {selectedSubmission.staffCounty}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Total Hours */}
              <div className="rounded-lg bg-teal-50 border border-teal-200 p-3">
                <p className="text-xs font-medium text-teal-600">Total Hours</p>
                <p className="text-2xl font-bold text-teal-800">
                  {(
                    (selectedSubmission.activities ?? []).reduce(
                      (sum, act) =>
                        sum +
                        Object.values(act.timeEntries).reduce(
                          (s, h) => s + (h || 0),
                          0,
                        ),
                      0,
                    ) ||
                    Object.values(selectedSubmission.dailyEntries ?? {}).reduce(
                      (s, h) => s + (h || 0),
                      0,
                    ) ||
                    selectedSubmission.totalHoursWorked ||
                    0
                  ).toFixed(1)}
                  h
                </p>
              </div>

              {/* Pre-approval Info */}
              {selectedSubmission.reviewedBy && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Pre-approved By (Facility)
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedSubmission.reviewedBy}
                  </p>
                </div>
              )}

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

              {/* Download */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => downloadTimesheetPDF(selectedSubmission)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" /> Download PDF
                </button>
                <button
                  onClick={() => exportTimesheetReport(selectedSubmission)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <FileText className="h-4 w-4" /> Timesheet Report
                </button>
              </div>

              {/* Actions */}
              {selectedSubmission.status === "facility_approved" && (
                <div className="space-y-2 pt-4">
                  <button
                    onClick={() => handleApprove(selectedSubmission.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 font-medium text-white transition-colors hover:bg-teal-700 shadow-sm"
                  >
                    <Check className="h-4 w-4" /> Approve &amp; Send to HR
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSubmissionForDetail(selectedSubmission);
                      setShowReviewDialog(true);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <RotateCcw className="h-4 w-4" /> Return for Revision
                  </button>
                </div>
              )}
              {selectedSubmission.status === "county_approved" && (
                <div className="pt-4">
                  <div className="rounded-lg bg-teal-50 border border-teal-200 p-3">
                    <p className="text-xs font-medium text-teal-700">
                      ✓ County Approved — Awaiting HR final approval
                    </p>
                    {selectedSubmission.countyRepDate && (
                      <p className="text-xs text-teal-600 mt-1">
                        Approved on{" "}
                        {new Date(
                          selectedSubmission.countyRepDate,
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>
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
      </div>

      {/* Detail View Modal */}
      {showDetailView && selectedSubmissionForDetail && (
        <CountyTimesheetDetailView
          submission={selectedSubmissionForDetail}
          onClose={() => {
            setShowDetailView(false);
            setSelectedSubmissionForDetail(null);
          }}
          onApprove={
            selectedSubmissionForDetail.status === "facility_approved"
              ? () => {
                  handleApprove(selectedSubmissionForDetail.id);
                  setShowDetailView(false);
                  setSelectedSubmissionForDetail(null);
                }
              : undefined
          }
          onReturn={
            selectedSubmissionForDetail.status === "facility_approved"
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

      {/* Review Dialog Modal */}
      {showReviewDialog && selectedSubmissionForDetail && (
        <CountyReviewDialog
          staffName={selectedSubmissionForDetail.staffName}
          period={`${MONTHS[selectedSubmissionForDetail.month]} ${selectedSubmissionForDetail.year}`}
          onSubmit={(feedback) => {
            handleReturnForRevision(selectedSubmissionForDetail.id, feedback);
            setShowReviewDialog(false);
            setSelectedSubmissionForDetail(null);
          }}
          onClose={() => {
            setShowReviewDialog(false);
            setSelectedSubmissionForDetail(null);
          }}
        />
      )}
    </div>
  );
}
