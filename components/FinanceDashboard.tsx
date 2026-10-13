"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LogOut,
  Wallet,
  Search,
  Download,
  FileSpreadsheet,
  Clock,
  Umbrella,
  Building2,
  MapPin,
  Eye,
  CheckCircle,
} from "lucide-react";
import { downloadTimesheetPDF } from "@/lib/timesheetDownload";
import type { AuthUser } from "@/lib/auth";
import usersData from "@/data/users.json";
import {
  pushLeavesToBackend,
  pullLeavesFromBackend,
  mergeLeaves,
  leavesChanged,
} from "@/lib/leaveBackend";
import {
  pushTimesheetsToBackend,
  pullTimesheetsFromBackend,
  mergeTimesheets,
  timesheetsChanged,
} from "@/lib/timesheetBackend";
import TimesheetReadOnlyView from "./TimesheetReadOnlyView";
import type {
  TimesheetSubmission,
  LeaveRequest,
} from "./StaffTimesheetDashboard";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FinanceDashboardProps {
  user: AuthUser;
  onLogout: () => void;
}

/** Fields shared by timesheets and leave forms, used for grouping/filtering. */
interface Groupable {
  facility: string;
  staffName: string;
  staffEmail: string;
  staffCounty?: string;
}

const STORAGE_KEY = "chak-timesheet-submissions";
const LEAVE_KEY = "chak-leave-requests";
const UNASSIGNED = "Unassigned";

// ─── Facility → County lookup (from the employee roster) ─────────────────────
// Some legacy records have no `staffCounty`, so we resolve the county from the
// facility name using the users.json roster as a fallback.

const FACILITY_COUNTY: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  Object.values(usersData as unknown as Record<string, any>).forEach((u) => {
    if (u?.facility && u?.county && !map[u.facility]) {
      map[u.facility] = u.county;
    }
  });
  return map;
})();

function countyOf(record: Groupable): string {
  return (
    (record.staffCounty && record.staffCounty.trim()) ||
    FACILITY_COUNTY[record.facility] ||
    UNASSIGNED
  );
}

// ─── Storage ─────────────────────────────────────────────────────────────────

function loadAll(): TimesheetSubmission[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAll(subs: TimesheetSubmission[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
  pushTimesheetsToBackend(subs);
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
  pushLeavesToBackend(leaves);
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

function prettyLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function financeDateOf(r: {
  financeSentAt?: string;
  hrDate?: string;
  reviewedAt?: string;
}): string | undefined {
  return r.financeSentAt || r.hrDate || r.reviewedAt;
}

// ─── Grouping ────────────────────────────────────────────────────────────────

type GroupBy = "county" | "facility";

interface Group<T> {
  key: string;
  label: string;
  sublabel: string;
  items: T[];
  hours: number;
}

function buildGroups<T extends Groupable>(
  items: T[],
  groupBy: GroupBy,
  hoursOf: (item: T) => number,
): Group<T>[] {
  const map = new Map<string, Group<T>>();
  for (const item of items) {
    const key =
      groupBy === "county" ? countyOf(item) : item.facility || UNASSIGNED;
    let group = map.get(key);
    if (!group) {
      const label = groupBy === "county" ? key : item.facility || UNASSIGNED;
      group = {
        key,
        label,
        sublabel: "",
        items: [],
        hours: 0,
      };
      map.set(key, group);
    }
    group.items.push(item);
    group.hours += hoursOf(item) || 0;
  }
  const groups = Array.from(map.values());

  // Second pass: sublabels (a short summary of what is inside the group).
  for (const g of groups) {
    if (groupBy === "county") {
      const facilities = new Set(g.items.map((i) => i.facility || UNASSIGNED));
      g.sublabel = `${facilities.size} ${
        facilities.size === 1 ? "facility" : "facilities"
      }`;
    } else {
      g.sublabel = countyOf(g.items[0]);
    }
  }

  groups.sort((a, b) => a.label.localeCompare(b.label));
  for (const g of groups) {
    g.items.sort((a, b) => a.staffName.localeCompare(b.staffName));
  }
  return groups;
}

// ─── CSV export ──────────────────────────────────────────────────────────────

function csvCell(value: unknown): string {
  const s = value === undefined || value === null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCSV(filename: string, header: string[], rows: unknown[][]) {
  const csv = [
    header.map(csvCell).join(","),
    ...rows.map((r) => r.map(csvCell).join(",")),
  ].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FinanceDashboard({
  user,
  onLogout,
}: FinanceDashboardProps) {
  const userEmail = user.email;
  const [timesheets, setTimesheets] = useState<TimesheetSubmission[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timesheet" | "leave">(
    "timesheet",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCounty, setFilterCounty] = useState("all");
  const [filterFacility, setFilterFacility] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("county");
  const [selectedTimesheet, setSelectedTimesheet] =
    useState<TimesheetSubmission | null>(null);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);

  // Everything Finance sees is fully approved by Program HR.
  const refresh = useCallback(() => {
    const approvedTimesheets = loadAll().filter((s) => s.status === "approved");
    approvedTimesheets.sort(
      (a, b) =>
        new Date(financeDateOf(b) || b.submittedAt || b.createdAt).getTime() -
        new Date(financeDateOf(a) || a.submittedAt || a.createdAt).getTime(),
    );
    setTimesheets(approvedTimesheets);

    const approvedLeaves = loadAllLeaves().filter(
      (l) => l.status === "approved",
    );
    approvedLeaves.sort(
      (a, b) =>
        new Date(
          financeDateOf(b) || b.submittedAt || b.createdAt || "",
        ).getTime() -
        new Date(
          financeDateOf(a) || a.submittedAt || a.createdAt || "",
        ).getTime(),
    );
    setLeaveRequests(approvedLeaves);

    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    const interval = setInterval(refresh, 15000);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  // Pull changes other roles made in the shared backend.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await pullTimesheetsFromBackend();
      if (cancelled || remote.length === 0) return;
      const local = loadAll();
      const merged = mergeTimesheets(local, remote);
      if (timesheetsChanged(local, merged)) {
        saveAll(merged);
        refresh();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await pullLeavesFromBackend();
      if (cancelled || remote.length === 0) return;
      const local = loadAllLeaves();
      const merged = mergeLeaves(local, remote);
      if (leavesChanged(local, merged)) {
        saveAllLeaves(merged);
        refresh();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  // ── Filters ──
  const matchesCommon = useCallback(
    (record: Groupable) => {
      if (filterCounty !== "all" && countyOf(record) !== filterCounty)
        return false;
      if (
        filterFacility !== "all" &&
        (record.facility || UNASSIGNED) !== filterFacility
      )
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const haystack = [
          record.staffName,
          record.staffEmail,
          record.facility,
          countyOf(record),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    },
    [filterCounty, filterFacility, searchQuery],
  );

  const filteredTimesheets = useMemo(
    () =>
      timesheets.filter((s) => {
        if (!matchesCommon(s)) return false;
        if (filterMonth !== "all") {
          const [y, m] = filterMonth.split("-").map(Number);
          if (s.year !== y || s.month !== m) return false;
        }
        return true;
      }),
    [timesheets, matchesCommon, filterMonth],
  );

  const filteredLeaves = useMemo(
    () => leaveRequests.filter((l) => matchesCommon(l)),
    [leaveRequests, matchesCommon],
  );

  // ── Filter option lists (scoped to the active tab) ──
  const activeRecords = useMemo<Groupable[]>(
    () => (activeTab === "timesheet" ? timesheets : leaveRequests),
    [activeTab, timesheets, leaveRequests],
  );

  const counties = useMemo(() => {
    const set = new Set<string>();
    activeRecords.forEach((r) => set.add(countyOf(r)));
    return Array.from(set).sort();
  }, [activeRecords]);

  const facilities = useMemo(() => {
    const set = new Set<string>();
    activeRecords.forEach((r) => {
      if (filterCounty !== "all" && countyOf(r) !== filterCounty) return;
      set.add(r.facility || UNASSIGNED);
    });
    return Array.from(set).sort();
  }, [activeRecords, filterCounty]);

  const monthOptions = useMemo(
    () =>
      Array.from(new Set(timesheets.map((s) => `${s.year}-${s.month}`))).sort(),
    [timesheets],
  );

  // Keep the location filters valid when the tab (or county) changes the
  // available options, so a stale selection never hides every record.
  useEffect(() => {
    if (filterCounty !== "all" && !counties.includes(filterCounty)) {
      setFilterCounty("all");
    }
  }, [counties, filterCounty]);

  useEffect(() => {
    if (filterFacility !== "all" && !facilities.includes(filterFacility)) {
      setFilterFacility("all");
    }
  }, [facilities, filterFacility]);

  // ── Grouped views ──
  const timesheetGroups = useMemo(
    () =>
      buildGroups(filteredTimesheets, groupBy, (s) => s.totalHoursWorked ?? 0),
    [filteredTimesheets, groupBy],
  );

  const leaveGroups = useMemo(
    () => buildGroups(filteredLeaves, groupBy, (l) => l.hoursTaken ?? 0),
    [filteredLeaves, groupBy],
  );

  // ── Totals ──
  const timesheetTotals = useMemo(() => {
    const hours = filteredTimesheets.reduce(
      (sum, s) => sum + (s.totalHoursWorked ?? 0),
      0,
    );
    const countySet = new Set(filteredTimesheets.map(countyOf));
    const facilitySet = new Set(
      filteredTimesheets.map((s) => s.facility || UNASSIGNED),
    );
    const staffSet = new Set(filteredTimesheets.map((s) => s.staffEmail));
    return {
      count: filteredTimesheets.length,
      hours,
      counties: countySet.size,
      facilities: facilitySet.size,
      staff: staffSet.size,
    };
  }, [filteredTimesheets]);

  const leaveTotals = useMemo(() => {
    const hours = filteredLeaves.reduce(
      (sum, l) => sum + (l.hoursTaken ?? 0),
      0,
    );
    const countySet = new Set(filteredLeaves.map(countyOf));
    const facilitySet = new Set(
      filteredLeaves.map((l) => l.facility || UNASSIGNED),
    );
    return {
      count: filteredLeaves.length,
      hours,
      counties: countySet.size,
      facilities: facilitySet.size,
    };
  }, [filteredLeaves]);

  const selectedLeave = leaveRequests.find((l) => l.id === selectedLeaveId);

  const hasActiveFilters =
    searchQuery !== "" ||
    filterCounty !== "all" ||
    filterFacility !== "all" ||
    filterMonth !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setFilterCounty("all");
    setFilterFacility("all");
    setFilterMonth("all");
  };

  // ── Exports ──
  const exportTimesheetsCSV = () => {
    downloadCSV(
      `approved-timesheets-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "County",
        "Facility",
        "Staff Name",
        "Staff Email",
        "Period",
        "Total Hours",
        "Approved By (HR)",
        "Received by Finance",
      ],
      filteredTimesheets.map((s) => [
        countyOf(s),
        s.facility,
        s.staffName,
        s.staffEmail,
        `${MONTHS[s.month]} ${s.year}`,
        (s.totalHoursWorked ?? 0).toFixed(1),
        s.reviewedBy || s.hrName || "",
        formatDate(financeDateOf(s)),
      ]),
    );
  };

  const exportLeavesCSV = () => {
    downloadCSV(
      `approved-leave-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "County",
        "Facility",
        "Staff Name",
        "Staff Email",
        "Leave Type",
        "Days",
        "Hours",
        "Start Date",
        "Reporting Date",
        "Approved By (HR)",
        "Received by Finance",
      ],
      filteredLeaves.map((l) => [
        countyOf(l),
        l.facility,
        l.staffName,
        l.staffEmail,
        prettyLabel(l.leaveType),
        l.leaveDays ?? "",
        l.hoursTaken ?? "",
        l.startDate || "",
        l.reportingDate || "",
        l.reviewedBy || l.hrName || "",
        formatDate(financeDateOf(l)),
      ]),
    );
  };

  const totals = activeTab === "timesheet" ? timesheetTotals : leaveTotals;

  // ── Render ──
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-sm">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Finance Dashboard
              </h1>
              <p className="text-sm text-gray-500">{userEmail}</p>
            </div>
            <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
              <Eye className="h-3.5 w-3.5" />
              Read-only
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 sm:flex">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">
                Only Program HR–approved records
              </span>
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
      </div>

      {/* Tab Bar */}
      <div className="border-b border-gray-200 bg-white px-8">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab("timesheet")}
            className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "timesheet"
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Clock className="h-4 w-4" />
            Timesheets
            <span className="ml-1 inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
              {timesheets.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("leave")}
            className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "leave"
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Umbrella className="h-4 w-4" />
            Leave Forms
            <span className="ml-1 inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
              {leaveRequests.length}
            </span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 px-8 pt-6 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {activeTab === "timesheet" ? "Timesheets" : "Leave Forms"}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {totals.count}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total Hours
          </p>
          <p className="mt-1 text-2xl font-bold text-sky-700">
            {totals.hours.toFixed(1)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Counties
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {totals.counties}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Facilities
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {totals.facilities}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1">
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Header + filters */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {activeTab === "timesheet"
                    ? "Approved Timesheets"
                    : "Approved Leave Forms"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {activeTab === "timesheet"
                    ? "Timesheets finalised by Program HR, organised for payroll."
                    : "Leave forms finalised by Program HR, organised for records."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Group by */}
                <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
                  {(
                    [
                      { value: "county", label: "Group by County" },
                      { value: "facility", label: "Group by Facility" },
                    ] as { value: GroupBy; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setGroupBy(opt.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        groupBy === opt.value
                          ? "bg-white text-sky-700 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={
                    activeTab === "timesheet"
                      ? exportTimesheetsCSV
                      : exportLeavesCSV
                  }
                  disabled={totals.count === 0}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Export CSV
                </button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search staff, email, facility or county..."
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <select
                value={filterCounty}
                onChange={(e) => setFilterCounty(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All Counties</option>
                {counties.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={filterFacility}
                onChange={(e) => setFilterFacility(e.target.value)}
                className="max-w-[240px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All Facilities</option>
                {facilities.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              {activeTab === "timesheet" && (
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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
              )}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50"
                >
                  Clear filters
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-gray-500">Loading…</p>
              </div>
            ) : activeTab === "timesheet" ? (
              filteredTimesheets.length === 0 ? (
                <EmptyState
                  icon={<Clock className="h-10 w-10 text-gray-300" />}
                  message={
                    hasActiveFilters
                      ? "No approved timesheets match your filters"
                      : "No approved timesheets yet. They appear here after Program HR final approval."
                  }
                />
              ) : (
                <div className="space-y-6">
                  {timesheetGroups.map((group) => (
                    <div
                      key={group.key}
                      className="overflow-hidden rounded-lg border border-gray-200 bg-white"
                    >
                      <div className="flex items-center justify-between border-b border-gray-200 bg-sky-50/60 px-6 py-3">
                        <div className="flex items-center gap-2">
                          {groupBy === "county" ? (
                            <MapPin className="h-4 w-4 text-sky-700" />
                          ) : (
                            <Building2 className="h-4 w-4 text-sky-700" />
                          )}
                          <p className="text-sm font-semibold text-gray-900">
                            {group.label}
                          </p>
                          <span className="text-xs text-gray-500">
                            · {group.sublabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span>
                            {group.items.length}{" "}
                            {group.items.length === 1
                              ? "timesheet"
                              : "timesheets"}
                          </span>
                          <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-sky-700">
                            {group.hours.toFixed(1)}h
                          </span>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                                Staff
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                                {groupBy === "county" ? "Facility" : "County"}
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                                Period
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                                Hours
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                                Approved By (HR)
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                                Received
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((row) => (
                              <tr
                                key={row.id}
                                className="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-sky-50/50"
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
                                  {groupBy === "county"
                                    ? row.facility
                                    : countyOf(row)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700">
                                  {MONTHS[row.month]} {row.year}
                                </td>
                                <td className="px-6 py-4">
                                  <span className="font-semibold text-gray-900">
                                    {(row.totalHoursWorked ?? 0).toFixed(1)}h
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700">
                                  {row.reviewedBy || row.hrName || "—"}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700">
                                  {formatDate(financeDateOf(row))}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => setSelectedTimesheet(row)}
                                      className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                                    >
                                      <Eye className="h-3.5 w-3.5" /> View
                                    </button>
                                    <button
                                      onClick={() => downloadTimesheetPDF(row)}
                                      className="flex items-center gap-1.5 rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-50"
                                    >
                                      <Download className="h-3.5 w-3.5" /> PDF
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : filteredLeaves.length === 0 ? (
              <EmptyState
                icon={<Umbrella className="h-10 w-10 text-gray-300" />}
                message={
                  hasActiveFilters
                    ? "No approved leave forms match your filters"
                    : "No approved leave forms yet. They appear here after Program HR final approval."
                }
              />
            ) : (
              <div className="space-y-6">
                {leaveGroups.map((group) => (
                  <div
                    key={group.key}
                    className="overflow-hidden rounded-lg border border-gray-200 bg-white"
                  >
                    <div className="flex items-center justify-between border-b border-gray-200 bg-sky-50/60 px-6 py-3">
                      <div className="flex items-center gap-2">
                        {groupBy === "county" ? (
                          <MapPin className="h-4 w-4 text-sky-700" />
                        ) : (
                          <Building2 className="h-4 w-4 text-sky-700" />
                        )}
                        <p className="text-sm font-semibold text-gray-900">
                          {group.label}
                        </p>
                        <span className="text-xs text-gray-500">
                          · {group.sublabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span>
                          {group.items.length}{" "}
                          {group.items.length === 1 ? "form" : "forms"}
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-sky-700">
                          {group.hours.toFixed(1)}h
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                              Staff
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                              {groupBy === "county" ? "Facility" : "County"}
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
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map((row) => (
                            <tr
                              key={row.id}
                              className="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-sky-50/50"
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
                                {groupBy === "county"
                                  ? row.facility
                                  : countyOf(row)}
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                {prettyLabel(row.leaveType)}
                              </td>
                              <td className="px-6 py-4 text-center text-sm font-semibold text-sky-700">
                                {row.hoursTaken}h
                              </td>
                              <td className="px-6 py-4 text-center text-sm text-gray-700">
                                {row.startDate
                                  ? new Date(
                                      row.startDate + "T00:00:00",
                                    ).toLocaleDateString()
                                  : "—"}
                              </td>
                              <td className="px-6 py-4 text-center text-sm text-gray-700">
                                {row.reportingDate
                                  ? new Date(
                                      row.reportingDate + "T00:00:00",
                                    ).toLocaleDateString()
                                  : "—"}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => setSelectedLeaveId(row.id)}
                                    className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                                  >
                                    <Eye className="h-3.5 w-3.5" /> View
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Leave detail panel (read-only) */}
        {activeTab === "leave" && selectedLeave && (
          <div className="w-80 overflow-y-auto border-l border-gray-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Leave Form
              </h3>
              <button
                onClick={() => setSelectedLeaveId(null)}
                className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {selectedLeave.staffName}
            </p>
            <div className="mt-6 space-y-4">
              <ReadOnlyField label="County" value={countyOf(selectedLeave)} />
              <ReadOnlyField
                label="Facility"
                value={selectedLeave.facility || "—"}
              />
              <ReadOnlyField
                label="Leave Type"
                value={prettyLabel(selectedLeave.leaveType)}
              />
              <div>
                <FieldLabel>Hours Taken</FieldLabel>
                <p className="mt-1 text-lg font-bold text-sky-700">
                  {selectedLeave.hoursTaken}h
                </p>
              </div>
              <ReadOnlyField
                label="Start Date"
                value={
                  selectedLeave.startDate
                    ? new Date(
                        selectedLeave.startDate + "T00:00:00",
                      ).toLocaleDateString()
                    : "—"
                }
              />
              <ReadOnlyField
                label="Reporting Date"
                value={
                  selectedLeave.reportingDate
                    ? new Date(
                        selectedLeave.reportingDate + "T00:00:00",
                      ).toLocaleDateString()
                    : "—"
                }
              />
              <ReadOnlyField
                label="Approved By (Program HR)"
                value={selectedLeave.reviewedBy || selectedLeave.hrName || "—"}
              />
              <ReadOnlyField
                label="Received by Finance"
                value={formatDate(financeDateOf(selectedLeave))}
              />
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <CheckCircle className="h-3.5 w-3.5" /> Fully Approved
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timesheet detail modal (read-only) */}
      {selectedTimesheet && (
        <TimesheetReadOnlyView
          submission={selectedTimesheet}
          role="finance"
          onClose={() => setSelectedTimesheet(null)}
        />
      )}
    </div>
  );
}

// ─── Small presentational helpers ────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
      {children}
    </p>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <p className="mt-1 text-sm text-gray-900">{value}</p>
    </div>
  );
}

function EmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-20">
      <div className="text-center">
        <div className="mb-3 flex justify-center">{icon}</div>
        <p className="text-gray-500">{message}</p>
      </div>
    </div>
  );
}
