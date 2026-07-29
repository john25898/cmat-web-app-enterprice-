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
  Umbrella,
} from "lucide-react";
import { downloadTimesheetPDF } from "@/lib/timesheetDownload";
import { exportTimesheetReport } from "@/lib/utils";
import TimesheetReadOnlyView from "./TimesheetReadOnlyView";
import type {
  TimesheetSubmission,
  LeaveRequest,
} from "./StaffTimesheetDashboard";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FacilityInchargeDashboardProps {
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
    case "pending":
      return "bg-blue-100 text-blue-800";
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
    case "draft":
      return "Draft";
    case "pending":
      return "Pending";
    case "facility_approved":
      return "Approved";
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

function TimesheetReviewDialog({
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
            className="mt-3 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
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

function TimesheetDetailView({
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
      role="facility_incharge"
      onApprove={onApprove}
      onReturn={onReturn}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FacilityInchargeDashboard({
  userEmail,
  onLogout,
}: FacilityInchargeDashboardProps) {
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

  const staffName = deriveName(userEmail);

  const refresh = useCallback(() => {
    const all = loadAll();
    // Show only pending (awaiting facility approval) and returned
    const relevant = all.filter(
      (s) => s.status === "pending" || s.status === "returned",
    );
    relevant.sort(
      (a, b) =>
        new Date(b.submittedAt || b.createdAt).getTime() -
        new Date(a.submittedAt || a.createdAt).getTime(),
    );
    setSubmissions(relevant);

    // Load leave requests
    const allLeaves = loadAllLeaves();
    const relevantLeaves = allLeaves.filter(
      (l) => l.status === "pending" || l.status === "returned",
    );
    relevantLeaves.sort(
      (a, b) =>
        new Date(b.submittedAt || b.createdAt).getTime() -
        new Date(a.submittedAt || a.createdAt).getTime(),
    );
    setLeaveRequests(relevantLeaves);

    setIsLoading(false);
  }, []);

  // Load data on mount
  useEffect(() => {
    refresh();
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

  const handleApprove = (id: string) => {
    const all = loadAll();
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) return;
    all[idx].status = "facility_approved";
    all[idx].reviewedAt = new Date().toISOString();
    all[idx].reviewFeedback = undefined;
    all[idx].reviewedBy = staffName;
    all[idx].reviewedByEmail = userEmail;
    saveAll(all);
    refresh();
    setToastMessage("✓ Timesheet approved — forwarded to County Rep");
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-sm">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Facility In-Charge Dashboard
              </h1>
              <p className="text-sm text-gray-500">{userEmail}</p>
            </div>
          </div>
          {/* Tab Bar */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("timesheet")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "timesheet" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600 hover:text-indigo-600"}`}
            >
              <Clock className="inline h-4 w-4 mr-1.5" />
              Timesheets
            </button>
            <button
              onClick={() => setActiveTab("leave")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "leave" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600 hover:text-indigo-600"}`}
            >
              <FileSpreadsheet className="inline h-4 w-4 mr-1.5" />
              Leave Requests
              {leaveRequests.filter((l) => l.status === "pending").length >
                0 && (
                <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full min-w-[18px]">
                  {leaveRequests.filter((l) => l.status === "pending").length}
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
        <div className="border-b border-gray-200 bg-indigo-50 px-8 py-3">
          <p className="text-sm text-indigo-700">{toastMessage}</p>
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
                      Staff Timesheet Approvals
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Review and approve timesheets from your facility staff
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
                        { value: "pending", label: "Pending" },
                        { value: "returned", label: "Returned" },
                      ].map((tab) => (
                        <button
                          key={tab.value}
                          onClick={() => setFilterStatus(tab.value)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            filterStatus === tab.value
                              ? "bg-white text-indigo-700 shadow-sm"
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
                      Staff Leave Requests
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Review and approve leave requests from your facility staff
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
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <p className="text-gray-500">Loading timesheets...</p>
                  </div>
                ) : filteredSubmissions.length === 0 ? (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-20">
                    <div className="text-center">
                      <Clock className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                      <p className="text-gray-500">
                        {searchQuery ||
                        filterStatus !== "all" ||
                        filterMonth !== "all"
                          ? "No matching timesheets found"
                          : "No pending timesheets. Staff submissions will appear here."}
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
                            Period
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                            Total Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                            Submitted
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
                            className={`cursor-pointer border-b border-gray-200 transition-colors hover:bg-indigo-50 ${selectedId === row.id ? "bg-indigo-50" : ""}`}
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
                              {row.submittedAt
                                ? new Date(row.submittedAt).toLocaleDateString()
                                : "—"}
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
                      <p className="text-gray-500">No pending leave requests</p>
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
                            onClick={() => setSelectedLeaveId(leave.id)}
                            className={`cursor-pointer border-b border-gray-200 transition-colors hover:bg-indigo-50 ${selectedLeaveId === leave.id ? "bg-indigo-50" : ""}`}
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
                            <td className="px-6 py-4 text-center text-sm font-semibold text-indigo-700">
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
              Review Timesheet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedSubmission.staffName}
            </p>
            <div className="mt-6 space-y-4">
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
                  Total Hours Worked
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
                  Submitted
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedSubmission.submittedAt
                    ? new Date(
                        selectedSubmission.submittedAt,
                      ).toLocaleDateString()
                    : "—"}
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
              {selectedSubmission.status === "pending" && (
                <div className="space-y-2 pt-4">
                  <button
                    onClick={() => handleApprove(selectedSubmission.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700 shadow-sm"
                  >
                    <Check className="h-4 w-4" /> Approve &amp; Forward to HR
                  </button>
                  <button
                    onClick={() => setShowReviewDialog(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <RotateCcw className="h-4 w-4" /> Return for Revision
                  </button>
                </div>
              )}
              {selectedSubmission.status === "returned" && (
                <div className="pt-4">
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-xs font-medium text-red-700">Returned</p>
                    {selectedSubmission.reviewFeedback && (
                      <p className="text-xs text-red-600 mt-1">
                        Feedback: {selectedSubmission.reviewFeedback}
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
                  Review Leave Request
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
                    <p className="mt-1 text-lg font-bold text-indigo-700">
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
                      Status
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeColor(leave.status)}`}
                    >
                      {statusLabel(leave.status)}
                    </span>
                  </div>
                  {leave.status === "pending" && (
                    <div className="space-y-2 pt-4">
                      <button
                        onClick={() => handleApproveLeave(leave.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700 shadow-sm"
                      >
                        <Check className="h-4 w-4" /> Approve &amp; Forward to
                        HR
                      </button>
                      <button
                        onClick={() => {
                          const fb = prompt("Enter feedback for return:");
                          if (fb?.trim())
                            handleReturnLeave(leave.id, fb.trim());
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        <RotateCcw className="h-4 w-4" /> Return to Staff
                      </button>
                    </div>
                  )}
                  {leave.status === "returned" && (
                    <div className="pt-4">
                      <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                        <p className="text-xs font-medium text-red-700">
                          Returned
                        </p>
                        {leave.reviewFeedback && (
                          <p className="text-xs text-red-600 mt-1">
                            Feedback: {leave.reviewFeedback}
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
        <TimesheetDetailView
          submission={selectedSubmissionForDetail}
          onClose={() => {
            setShowDetailView(false);
            setSelectedSubmissionForDetail(null);
          }}
          onApprove={
            selectedSubmissionForDetail.status === "pending"
              ? () => {
                  handleApprove(selectedSubmissionForDetail.id);
                  setShowDetailView(false);
                  setSelectedSubmissionForDetail(null);
                }
              : undefined
          }
          onReturn={
            selectedSubmissionForDetail.status === "pending"
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

      {/* Review Dialog */}
      {showReviewDialog && selectedSubmission && (
        <TimesheetReviewDialog
          staffName={selectedSubmission.staffName}
          period={`${MONTHS[selectedSubmission.month]} ${selectedSubmission.year}`}
          onSubmit={(feedback) => {
            handleReturnForRevision(selectedSubmission.id, feedback);
            setShowReviewDialog(false);
          }}
          onClose={() => setShowReviewDialog(false)}
        />
      )}
    </div>
  );
}
