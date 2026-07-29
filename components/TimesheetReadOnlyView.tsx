"use client";

import { useState } from "react";
import {
  X,
  Download,
  Check,
  RotateCcw,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
} from "lucide-react";
import { downloadTimesheetPDF } from "@/lib/timesheetDownload";
import { exportTimesheetReport } from "@/lib/utils";
import type { TimesheetSubmission } from "./StaffTimesheetDashboard";

// ─── Props ───────────────────────────────────────────────────────────────────

interface TimesheetReadOnlyViewProps {
  submission: TimesheetSubmission;
  onClose: () => void;
  role: "facility_incharge" | "county_rep" | "program_hr";
  onApprove?: () => void;
  onReturn?: (feedback: string) => void;
}

// ─── Constants & Helpers ─────────────────────────────────────────────────────

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

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month, day).getDay();
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

function getWeekDays(year: number, month: number, weekIndex: number): number[] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const offset = (firstDow + 6) % 7;
  const virtualMon = weekIndex * 7 - offset + 1;
  const startDay = Math.max(1, virtualMon);
  const endDay = Math.min(daysInMonth, virtualMon + 6);
  const days: number[] = [];
  for (let d = startDay; d <= endDay; d++) {
    days.push(d);
  }
  return days;
}

function getWeeksInMonth(year: number, month: number): number {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const offset = (firstDow + 6) % 7;
  return Math.ceil((daysInMonth + offset) / 7);
}

function statusBadgeColor(status: string) {
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function TimesheetReadOnlyView({
  submission,
  onClose,
  role,
  onApprove,
  onReturn,
}: TimesheetReadOnlyViewProps) {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [feedback, setFeedback] = useState("");

  // ── Computed values ──
  const activities = submission.activities ?? [];
  const dailyEntries = submission.dailyEntries ?? {};

  const computedActivityTotal = activities.reduce((sum, act) => {
    return (
      sum + Object.values(act.timeEntries).reduce((s, h) => s + (h || 0), 0)
    );
  }, 0);
  const computedDailyTotal = Object.values(dailyEntries).reduce(
    (s, h) => s + (h || 0),
    0,
  );
  const displayTotalHours =
    computedActivityTotal > 0
      ? computedActivityTotal
      : computedDailyTotal > 0
        ? computedDailyTotal
        : (submission.totalHoursWorked ?? submission.totalHours ?? 0);

  const totalTimeAllocated =
    getWorkingDaysInMonth(submission.year, submission.month) * 8;
  const utilPercent =
    totalTimeAllocated > 0 ? (displayTotalHours / totalTimeAllocated) * 100 : 0;

  const weeksInMonth = getWeeksInMonth(submission.year, submission.month);
  const weekDays = getWeekDays(submission.year, submission.month, selectedWeek);

  // ── Approval progress ──
  const approvedCount =
    submission.status === "facility_approved"
      ? 1
      : submission.status === "county_approved"
        ? 2
        : submission.status === "approved"
          ? 3
          : 0;
  const pct = Math.round((approvedCount / 3) * 100);

  // ── Role-specific display ──
  const roleGradient =
    role === "facility_incharge"
      ? "from-indigo-50 to-white"
      : role === "county_rep"
        ? "from-teal-50 to-white"
        : "from-emerald-50 to-white";

  const roleAccent =
    role === "facility_incharge"
      ? "indigo"
      : role === "county_rep"
        ? "teal"
        : "emerald";

  const roleTitle =
    role === "facility_incharge"
      ? "Facility In-Charge"
      : role === "county_rep"
        ? "County Representative"
        : "Program HR";

  // ── Check if this role can act ──
  const canActOn =
    role === "facility_incharge"
      ? submission.status === "pending"
      : role === "county_rep"
        ? submission.status === "facility_approved"
        : submission.status === "county_approved";

  // ── Render day cell ──
  function renderDayCell(actId: string, day: number) {
    const dateKey = `${submission.year}-${String(submission.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const act = activities.find((a) => a.id === actId);
    const val = act ? act.timeEntries[dateKey] || 0 : 0;
    const dow = getDayOfWeek(submission.year, submission.month, day);
    const isWknd = dow === 0 || dow === 6;
    return (
      <td
        key={day}
        className={`px-3 py-3 text-center border-r border-gray-100 last:border-r-0 ${isWknd ? "bg-red-50/40" : ""}`}
      >
        <span
          className={`text-sm font-bold ${isWknd ? "text-gray-400" : "text-indigo-700"}`}
        >
          {val > 0 ? val.toFixed(1) : "—"}
        </span>
      </td>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-lg">
        {/* ═══ Header ═══ */}
        <div
          className={`flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4 bg-gradient-to-r ${roleGradient} rounded-t-lg`}
        >
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
                {statusLabel(submission.status)}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportTimesheetReport(submission)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              <FileText className="h-3.5 w-3.5" />
              Report
            </button>
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
        </div>

        {/* ═══ Scrollable Content ═══ */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* ── Profile Card (read-only) ── */}
          <div className="rounded-2xl border border-indigo-100/60 bg-white shadow-md px-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Job Title
                </label>
                <div className="w-full rounded-lg border border-indigo-200 bg-indigo-100/50 px-3 py-2 text-sm font-semibold text-gray-700 select-none">
                  {submission.staffJobTitle || "—"}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Facility
                </label>
                <div className="w-full rounded-lg border border-indigo-200 bg-indigo-100/50 px-3 py-2 text-sm font-semibold text-gray-700 select-none">
                  {submission.facility || "—"}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  County
                </label>
                <div className="w-full rounded-lg border border-indigo-200 bg-indigo-100/50 px-3 py-2 text-sm font-semibold text-gray-700 select-none">
                  {submission.staffCounty || "—"}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Phone Number
                </label>
                <div className="w-full rounded-lg border border-indigo-200 bg-indigo-100/50 px-3 py-2 text-sm font-semibold text-gray-700 select-none">
                  {submission.staffTelephone || "—"}
                </div>
              </div>
            </div>
          </div>

          {/* ── Week Tabs ── */}
          {activities.length > 0 && (
            <div className="flex items-center gap-1">
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
          )}

          {/* ── Activity Grid ── */}
          {activities.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white/50 p-12 text-center">
              <p className="text-sm text-gray-500 mb-2">
                No activities recorded
              </p>
              <p className="text-xs text-gray-400">
                The staff member has not added any activities for this period.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-indigo-100/60 bg-white shadow-md overflow-hidden">
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
                      {weekDays.map((day) => {
                        const dow = getDayOfWeek(
                          submission.year,
                          submission.month,
                          day,
                        );
                        const isWknd = dow === 0 || dow === 6;
                        return (
                          <th
                            key={day}
                            className={`px-3 py-3 text-center text-xs font-bold border-r border-indigo-500 last:border-r-0 ${isWknd ? "text-red-300" : "text-white"}`}
                          >
                            <div className="text-base font-bold">{day}</div>
                            <div className="text-[10px] opacity-80">
                              {DAY_NAMES[dow]}
                            </div>
                          </th>
                        );
                      })}
                      <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase w-[10%]">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((act, idx) => {
                      const actTotal = weekDays.reduce((sum, day) => {
                        const dateKey = `${submission.year}-${String(submission.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
                          {weekDays.map((day) => renderDayCell(act.id, day))}
                          <td className="px-3 py-3 text-center border-l border-gray-100">
                            <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700">
                              {actTotal.toFixed(1)}
                            </span>
                          </td>
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
                      {weekDays.map((day) => {
                        const dayTotal = activities.reduce((sum, act) => {
                          const dateKey = `${submission.year}-${String(submission.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
                              return (
                                sum +
                                weekDays.reduce((s, day) => {
                                  const dateKey = `${submission.year}-${String(submission.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                  return s + (act.timeEntries[dateKey] || 0);
                                }, 0)
                              );
                            }, 0)
                            .toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Monthly Summary ── */}
          <div className="rounded-2xl border border-indigo-100/60 bg-white shadow-md overflow-hidden">
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
                  <p
                    className={`text-2xl font-bold mt-1 ${utilPercent >= 100 ? "text-green-600" : "text-amber-600"}`}
                  >
                    {utilPercent.toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Approval Status ── */}
          <div className="rounded-2xl border border-indigo-100/60 bg-white shadow-md overflow-hidden">
            <div className="px-5 py-3 bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100/60">
              <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Approval Status
              </h3>
            </div>
            <div className="p-5 space-y-5">
              {/* Progress Bar */}
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
                      approvedCount >= 1 ? "text-indigo-600 font-semibold" : ""
                    }
                  >
                    Facility
                  </span>
                  <span
                    className={
                      approvedCount >= 2 ? "text-teal-600 font-semibold" : ""
                    }
                  >
                    County
                  </span>
                  <span
                    className={
                      approvedCount >= 3 ? "text-green-600 font-semibold" : ""
                    }
                  >
                    HR
                  </span>
                </div>
              </div>

              {/* Facility In-Charge Row */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Supervisor Name
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {submission.supervisorName || "Facility In-Charge"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Designation
                    </p>
                    <p className="text-sm font-semibold text-gray-700">
                      {submission.supervisorDesignation || "Facility In-Charge"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Comments
                    </p>
                    <p className="text-sm text-gray-700">
                      {submission.reviewFeedback || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Status
                    </p>
                    {submission.status === "facility_approved" ||
                    submission.status === "county_approved" ||
                    submission.status === "approved" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-bold border border-green-200">
                        <Check className="h-3 w-3" /> APPROVED
                      </span>
                    ) : submission.status === "returned" ? (
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

              {/* County Rep Row */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      County Rep Name
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {submission.countyRepName || "County Representative"}
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
                      {submission.countyRepComment || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Status
                    </p>
                    {submission.status === "county_approved" ||
                    submission.status === "approved" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-bold border border-green-200">
                        <Check className="h-3 w-3" /> APPROVED
                      </span>
                    ) : submission.status === "returned" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-800 px-3 py-1 text-xs font-bold border border-red-200">
                        <X className="h-3 w-3" /> RETURNED
                      </span>
                    ) : submission.status === "facility_approved" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-800 px-3 py-1 text-xs font-bold border border-blue-200">
                        <Clock className="h-3 w-3" /> AWAITING COUNTY REP
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold border border-amber-200">
                        <Clock className="h-3 w-3" /> PENDING
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* HR Officer Row */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      HR Officer Name
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {submission.hrName || "Program HR"}
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
                      {submission.hrComment || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Status
                    </p>
                    {submission.status === "approved" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-bold border border-green-200">
                        <Check className="h-3 w-3" /> APPROVED
                      </span>
                    ) : submission.status === "county_approved" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-800 px-3 py-1 text-xs font-bold border border-blue-200">
                        <Clock className="h-3 w-3" /> AWAITING HR
                      </span>
                    ) : submission.status === "returned" ? (
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

              {/* Download PDF */}
              <div className="px-0 pb-2">
                <button
                  onClick={() => downloadTimesheetPDF(submission)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  <Download className="h-4 w-4" /> Download Timesheet PDF
                </button>
              </div>
            </div>
          </div>

          {/* ── Pre-approval Chain Info (role-specific) ── */}
          {role === "county_rep" &&
            submission.status === "facility_approved" &&
            submission.reviewedBy && (
              <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
                <p className="text-xs text-indigo-700">
                  ✓ Pre-approved by Facility In-Charge:{" "}
                  <span className="font-medium">{submission.reviewedBy}</span>
                  {submission.reviewedAt && (
                    <>
                      {" "}
                      on {new Date(submission.reviewedAt).toLocaleDateString()}
                    </>
                  )}
                </p>
              </div>
            )}

          {role === "program_hr" && (
            <div className="space-y-2">
              {submission.reviewedBy && (
                <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
                  <p className="text-xs text-indigo-700">
                    ✓ Approved by Facility In-Charge:{" "}
                    <span className="font-medium">{submission.reviewedBy}</span>
                    {submission.reviewedAt && (
                      <>
                        {" "}
                        on{" "}
                        {new Date(submission.reviewedAt).toLocaleDateString()}
                      </>
                    )}
                  </p>
                </div>
              )}
              {submission.countyRepName && (
                <div className="rounded-lg bg-teal-50 border border-teal-200 p-3">
                  <p className="text-xs text-teal-700">
                    ✓ Reviewed by County Rep:{" "}
                    <span className="font-medium">
                      {submission.countyRepName}
                    </span>
                    {submission.countyRepDate && (
                      <>
                        {" "}
                        on{" "}
                        {new Date(
                          submission.countyRepDate,
                        ).toLocaleDateString()}
                      </>
                    )}
                    {submission.countyRepComment && (
                      <> &mdash; "{submission.countyRepComment}"</>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Submitted timestamp */}
          {submission.submittedAt && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs text-blue-700">
                Submitted: {new Date(submission.submittedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* ═══ Footer Actions ═══ */}
        {canActOn && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 bg-gray-50/80">
            {!showReturnForm ? (
              <>
                <button
                  onClick={() => setShowReturnForm(true)}
                  className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Return for Revision
                </button>
                <button
                  onClick={onApprove}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors shadow-sm ${
                    role === "facility_incharge"
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : role === "county_rep"
                        ? "bg-teal-600 hover:bg-teal-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  <Check className="h-4 w-4" />
                  {role === "facility_incharge"
                    ? "Approve"
                    : role === "county_rep"
                      ? "Approve & Send to HR"
                      : "Final Approve"}
                </button>
              </>
            ) : (
              <div className="flex w-full flex-col gap-3">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe what needs to be revised..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
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
                    Submit Feedback
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Already processed badge */}
        {!canActOn && submission.status !== "pending" && (
          <div className="flex shrink-0 items-center gap-2 border-t border-gray-100 px-6 py-4 bg-gray-50/50">
            {submission.status === "facility_approved" &&
            role === "facility_incharge" ? (
              <>
                <Check className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700">
                  You already approved this timesheet
                </span>
              </>
            ) : submission.status === "county_approved" &&
              role === "county_rep" ? (
              <>
                <Check className="h-4 w-4 text-teal-600" />
                <span className="text-sm font-medium text-teal-700">
                  You already approved this timesheet
                </span>
              </>
            ) : submission.status === "approved" && role === "program_hr" ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  HR Approved - Final
                </span>
              </>
            ) : submission.status === "approved" ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Fully Approved
                </span>
              </>
            ) : submission.status === "returned" ? (
              <>
                <RotateCcw className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">
                  Returned
                </span>
                {submission.reviewFeedback && (
                  <span className="text-xs text-gray-400">
                    &mdash; {submission.reviewFeedback}
                  </span>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
