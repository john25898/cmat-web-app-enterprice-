"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, LogOut, AlertCircle, Edit2 } from "lucide-react";
import WorkplanForm from "./WorkplanForm";
import ReportForm from "./ReportForm";
import {
  uploadSubmission,
  fetchAllEmployeeSubmissions,
  updateSubmissionStatus,
} from "@/lib/supabase";

interface EmployeeDashboardProps {
  userEmail: string;
  onLogout: () => void;
}

interface Submission {
  dbId: string;
  type: "workplan" | "report";
  data: Record<string, unknown>;
  status: "draft" | "pending" | "approved" | "returned";
  feedback?: string;
  createdAt: Date;
}

function deriveName(email: string): string {
  return email
    .split("@")[0]
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function EmployeeDashboard({
  userEmail,
  onLogout,
}: EmployeeDashboardProps) {
  const [activeTab, setActiveTab] = useState<"workplans" | "reports">(
    "workplans",
  );
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tablesExist, setTablesExist] = useState(true);
  const [showNotifDot, setShowNotifDot] = useState(false);

  const employeeName = deriveName(userEmail);
  const returnedSubmission = submissions.find((s) => s.status === "returned");

  // Load submissions from Supabase
  const loadSubmissions = useCallback(async () => {
    try {
      const result = await fetchAllEmployeeSubmissions(userEmail);
      if (result.tableMissing) {
        setTablesExist(false);
        setSubmissions([]);
        setIsLoading(false);
        return;
      }
      if (result.success) {
        const mapped: Submission[] = result.data.map(
          (item: Record<string, unknown>) => ({
            dbId: item.id as string,
            type: item.submissionType as "workplan" | "report",
            data: (item.submission_data as Record<string, unknown>) || {},
            status: (item.status as Submission["status"]) || "pending",
            feedback: item.feedback as string | undefined,
            createdAt: new Date(item.created_at as string),
          }),
        );
        setSubmissions(mapped);
        setShowNotifDot(mapped.some((s) => s.status === "returned"));
      }
    } catch {
      /* silent */
    }
    setIsLoading(false);
  }, [userEmail]);

  // Initial load + poll for status changes every 15s
  useEffect(() => {
    loadSubmissions();
    const interval = setInterval(loadSubmissions, 15000);
    return () => clearInterval(interval);
  }, [loadSubmissions]);

  const handleSaveWorkplan = async (data: Record<string, unknown>) => {
    if (editingId) {
      // Re-submit as draft
      await updateSubmissionStatus(editingId, "draft", undefined, "workplan");
      setSubmissions((prev) =>
        prev.map((s) =>
          s.dbId === editingId ? { ...s, data, status: "draft" as const } : s,
        ),
      );
      setEditingId(null);
    } else {
      const result = await uploadSubmission(
        data,
        "workplan",
        userEmail,
        employeeName,
        "draft",
      );
      if (result.success && result.data?.[0]) {
        const row = result.data[0];
        setSubmissions((prev) => [
          {
            dbId: row.id,
            type: "workplan",
            data,
            status: "draft",
            createdAt: new Date(row.created_at),
          },
          ...prev,
        ]);
      }
    }
  };

  const handleSubmitWorkplan = async (data: Record<string, unknown>) => {
    if (editingId) {
      await updateSubmissionStatus(editingId, "pending", undefined, "workplan");
      setSubmissions((prev) =>
        prev.map((s) =>
          s.dbId === editingId
            ? { ...s, data, status: "pending" as const, feedback: undefined }
            : s,
        ),
      );
      setEditingId(null);
    } else {
      const result = await uploadSubmission(
        data,
        "workplan",
        userEmail,
        employeeName,
        "pending",
      );
      if (result.success && result.data?.[0]) {
        const row = result.data[0];
        setSubmissions((prev) => [
          {
            dbId: row.id,
            type: "workplan",
            data,
            status: "pending",
            createdAt: new Date(row.created_at),
          },
          ...prev,
        ]);
      }
    }
  };

  const handleSaveReport = async (data: Record<string, unknown>) => {
    const result = await uploadSubmission(
      data,
      "report",
      userEmail,
      employeeName,
      "pending",
    );
    if (result.success && result.data?.[0]) {
      const row = result.data[0];
      setSubmissions((prev) => [
        {
          dbId: row.id,
          type: "report",
          data,
          status: "pending",
          createdAt: new Date(row.created_at),
        },
        ...prev,
      ]);
    }
  };

  const handleEditWorkplan = (dbId: string) => {
    setEditingId(dbId);
    setActiveTab("workplans");
  };

  const workplans = submissions.filter((s) => s.type === "workplan");
  const reports = submissions.filter((s) => s.type === "report");

  // Tables-not-ready screen
  if (!tablesExist) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Database Not Ready
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            The database tables haven't been created yet. Run the migration in
            your Supabase dashboard.
          </p>
          <p className="mt-4 text-xs text-gray-500">
            Logged in as: {userEmail}
          </p>
          <button
            onClick={onLogout}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <h2 className="font-semibold text-gray-900">Navigation</h2>
        </div>
        <nav className="space-y-1 px-3 py-4">
          <button
            onClick={() => setActiveTab("workplans")}
            className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              activeTab === "workplans"
                ? "bg-sky-50 text-sky-600"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            My Workplans
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
              activeTab === "reports"
                ? "bg-sky-50 text-sky-600"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            My Field Reports
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Employee Workspace
            </h1>
            <p className="text-sm text-gray-500">{userEmail}</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100">
              <Bell className="h-6 w-6" />
              {showNotifDot && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Alert Banner for returned submissions */}
        {returnedSubmission && (
          <div className="bg-red-50 px-8 py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900">
                  🚨{" "}
                  {returnedSubmission.type === "workplan"
                    ? "WorkPlan"
                    : "Report"}{" "}
                  Returned for Revision
                </p>
                <p className="mt-1 text-sm text-red-800">
                  {returnedSubmission.feedback ||
                    "Your submission requires revision. Please review and resubmit."}
                </p>
              </div>
              {returnedSubmission.type === "workplan" && (
                <button
                  onClick={() => handleEditWorkplan(returnedSubmission.dbId)}
                  className="rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200"
                >
                  Edit & Resubmit
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {activeTab === "workplans" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingId ? "Edit Workplan" : "Create Monthly Workplan"}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    ICT Monthly CMaT WorkPlan
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <WorkplanForm
                    onSave={handleSaveWorkplan}
                    onSubmit={handleSubmitWorkplan}
                    editingData={
                      editingId
                        ? workplans.find((w) => w.dbId === editingId)?.data
                        : undefined
                    }
                  />
                </div>

                {/* Workplans List */}
                {workplans.length > 0 ? (
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Your Workplans
                    </h3>
                    <div className="mt-3 space-y-2">
                      {workplans.map((wp) => (
                        <div
                          key={wp.dbId}
                          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              Workplan{" "}
                              {new Date(wp.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-500">
                              Status:{" "}
                              <span
                                className={`font-medium ${
                                  wp.status === "draft"
                                    ? "text-gray-600"
                                    : wp.status === "pending"
                                      ? "text-sky-600"
                                      : wp.status === "approved"
                                        ? "text-green-600"
                                        : "text-red-600"
                                }`}
                              >
                                {wp.status.charAt(0).toUpperCase() +
                                  wp.status.slice(1)}
                              </span>
                              {wp.feedback && (
                                <span className="ml-2 text-xs text-gray-400">
                                  ({wp.feedback.substring(0, 40)}...)
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {(wp.status === "draft" ||
                              wp.status === "returned") && (
                              <button
                                onClick={() => handleEditWorkplan(wp.dbId)}
                                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                                title="Edit workplan"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}
                            {wp.status === "approved" && (
                              <span className="text-xs font-medium text-green-600">
                                ✓ Approved
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  !isLoading && (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
                      <p className="text-sm text-gray-500">
                        No workplans yet. Create your first workplan above.
                      </p>
                    </div>
                  )
                )}
              </div>
            )}

            {activeTab === "reports" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Create Field Report
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    ICT Officer Monthly CMaT Report
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <ReportForm
                    onSubmit={handleSaveReport}
                    linkedWorkplans={workplans
                      .filter(
                        (w) =>
                          w.status === "pending" || w.status === "approved",
                      )
                      .map((w) => ({ id: w.dbId, data: w.data }))}
                  />
                </div>

                {/* Reports List */}
                {reports.length > 0 ? (
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Your Reports
                    </h3>
                    <div className="mt-3 space-y-2">
                      {reports.map((rp) => (
                        <div
                          key={rp.dbId}
                          className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300"
                        >
                          <p className="font-medium text-gray-900">
                            Report {new Date(rp.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            Status:{" "}
                            <span
                              className={`font-medium ${
                                rp.status === "pending"
                                  ? "text-sky-600"
                                  : rp.status === "approved"
                                    ? "text-green-600"
                                    : "text-red-600"
                              }`}
                            >
                              {rp.status.charAt(0).toUpperCase() +
                                rp.status.slice(1)}
                            </span>
                            {rp.feedback && (
                              <span className="ml-2 text-xs text-gray-400">
                                ({rp.feedback.substring(0, 40)}...)
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  !isLoading && (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
                      <p className="text-sm text-gray-500">
                        No reports yet. Submit your first report above.
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
