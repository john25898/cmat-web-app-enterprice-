"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LogOut,
  Download,
  Check,
  RotateCcw,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import ReviewDialog from "./ReviewDialog";
import SubmissionDetailView from "./SubmissionDetailView";
import {
  downloadSubmissionAsCSV,
  downloadSubmissionAsWord,
  downloadSubmissionAsPDF,
} from "@/lib/downloadUtils";
import {
  testConnection,
  updateSubmissionStatus,
  fetchAllSubmissions,
} from "@/lib/supabase";

interface SubmissionRow {
  id: string;
  employeeName: string;
  email: string;
  submissionType: "Workplan" | "Report";
  dateSubmitted: string;
  region: string;
  totalBudget?: number;
  status: "Pending" | "Approved" | "Returned";
  submissionData?: Record<string, unknown>;
}

interface SupervisorDashboardProps {
  userEmail: string;
  onLogout: () => void;
}

export default function SupervisorDashboard({
  userEmail,
  onLogout,
}: SupervisorDashboardProps) {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedSubmissionForDetail, setSelectedSubmissionForDetail] =
    useState<SubmissionRow | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [tablesExist, setTablesExist] = useState(true);
  const [openDownloadId, setOpenDownloadId] = useState<string | null>(null);

  const selectedSubmission = submissions.find((s) => s.id === selectedId);

  // Load data from Supabase
  const loadSubmissions = useCallback(async () => {
    const result = await fetchAllSubmissions();
    if (result.tableMissing) {
      setTablesExist(false);
      setSubmissions([]);
      setIsLoading(false);
      return;
    }
    if (result.success) {
      const mapped: SubmissionRow[] = result.data.map(
        (item: Record<string, unknown>) => ({
          id: item.id as string,
          employeeName: item.employee_name as string,
          email: item.employee_email as string,
          submissionType: item.submissionType as "Workplan" | "Report",
          dateSubmitted: (item.created_at as string)?.split("T")[0] || "",
          region: (item.region as string) || "",
          totalBudget: undefined,
          status: ((item.status as string)?.charAt(0).toUpperCase() +
            (item.status as string)?.slice(1)) as
            | "Pending"
            | "Approved"
            | "Returned",
          submissionData: item.submission_data as Record<string, unknown>,
        }),
      );
      setSubmissions(mapped);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const conn = await testConnection();
      setConnectionStatus(conn.success ? "Connected" : "Not Connected");
      await loadSubmissions();
    };
    init();
    // Poll for new submissions every 15s
    const interval = setInterval(loadSubmissions, 15000);
    return () => clearInterval(interval);
  }, [loadSubmissions]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Close download dropdown when clicking outside
  useEffect(() => {
    const handler = () => setOpenDownloadId(null);
    if (openDownloadId) {
      document.addEventListener("click", handler);
      return () => document.removeEventListener("click", handler);
    }
  }, [openDownloadId]);

  const handleApprove = async (id: string) => {
    const sub = submissions.find((s) => s.id === id);
    if (!sub) return;
    await updateSubmissionStatus(
      id,
      "approved",
      undefined,
      sub.submissionType === "Workplan" ? "workplan" : "report",
    );
    // Optimistic update
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "Approved" } : s)),
    );
    setSelectedId(null);
    setToastMessage("✓ Submission approved successfully");
  };

  const handleReturnForRevision = async (id: string, feedback: string) => {
    const sub = submissions.find((s) => s.id === id);
    if (!sub) return;
    await updateSubmissionStatus(
      id,
      "returned",
      feedback,
      sub.submissionType === "Workplan" ? "workplan" : "report",
    );
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "Returned" } : s)),
    );
    setSelectedId(null);
    setShowReviewDialog(false);
    setToastMessage(`Submission returned with feedback: "${feedback}"`);
  };

  const handleDownload = async (
    id: string,
    employeeName: string,
    format: "csv" | "word" | "pdf",
  ) => {
    const submission = submissions.find((s) => s.id === id);
    if (!submission || !submission.submissionData) {
      setToastMessage("Error: Submission data not found");
      return;
    }
    setOpenDownloadId(null);

    const fmtLabel =
      format === "csv" ? "CSV" : format === "word" ? "Word" : "PDF";
    try {
      if (format === "csv") {
        downloadSubmissionAsCSV(
          submission.submissionData,
          submission.submissionType,
        );
      } else if (format === "word") {
        downloadSubmissionAsWord(
          submission.submissionData,
          submission.submissionType,
        );
      } else if (format === "pdf") {
        await downloadSubmissionAsPDF(
          submission.submissionData,
          submission.submissionType,
        );
      }
      setToastMessage(
        `Downloaded ${employeeName}'s ${submission.submissionType} as ${fmtLabel}`,
      );
    } catch {
      setToastMessage(`Error downloading as ${fmtLabel}`);
    }
  };

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Returned":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!tablesExist) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900">
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
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Supervisor Management Dashboard
            </h1>
            <p className="text-sm text-gray-500">{userEmail}</p>
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="border-b border-gray-200 bg-sky-50 px-8 py-3">
          <p className="text-sm text-sky-700">{toastMessage}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Data Pipeline Table */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Data Pipeline Monitor
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                All employee submissions
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-gray-500">Loading submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-20">
                <p className="text-gray-500">
                  No submissions yet. Submissions will appear here once
                  employees submit them.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                        Employee Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                        Date Submitted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                        Region
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">
                        Download
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => {
                          setSelectedId(row.id);
                          setSelectedSubmissionForDetail(row);
                          setShowDetailView(true);
                        }}
                        className={`cursor-pointer border-b border-gray-200 transition-colors hover:bg-sky-50 ${
                          selectedId === row.id ? "bg-sky-50" : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">
                            {row.employeeName}
                          </p>
                          <p className="text-xs text-gray-500">{row.email}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {row.submissionType}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {new Date(row.dateSubmitted).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {row.region}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeColor(row.status)}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDownloadId(
                                openDownloadId === row.id ? null : row.id,
                              );
                            }}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-50"
                            title="Download options"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {openDownloadId === row.id && (
                            <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-gray-200 bg-white shadow-lg">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(
                                    row.id,
                                    row.employeeName,
                                    "csv",
                                  );
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-sky-50"
                              >
                                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                CSV
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(
                                    row.id,
                                    row.employeeName,
                                    "word",
                                  );
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-sky-50"
                              >
                                <FileText className="h-4 w-4 text-blue-600" />
                                Word
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(
                                    row.id,
                                    row.employeeName,
                                    "pdf",
                                  );
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-sky-50"
                              >
                                <FileText className="h-4 w-4 text-red-600" />
                                PDF
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Review Panel */}
        {selectedSubmission && (
          <div className="w-80 border-l border-gray-200 bg-white p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900">
              Review Submission
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedSubmission.employeeName}
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Type
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedSubmission.submissionType}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Region
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedSubmission.region}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Date Submitted
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(
                    selectedSubmission.dateSubmitted,
                  ).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </p>
                <span
                  className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeColor(selectedSubmission.status)}`}
                >
                  {selectedSubmission.status}
                </span>
              </div>

              {/* Action Buttons */}
              {selectedSubmission.status === "Pending" && (
                <div className="pt-4 space-y-2">
                  <button
                    onClick={() => handleApprove(selectedSubmission.id)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
                  >
                    <Check className="h-4 w-4" />
                    Approve Submission
                  </button>

                  <button
                    onClick={() => setShowReviewDialog(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Return for Revision
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail View Modal */}
      {showDetailView && selectedSubmissionForDetail && (
        <SubmissionDetailView
          submission={
            selectedSubmissionForDetail.submissionData ||
            selectedSubmissionForDetail
          }
          submissionType={selectedSubmissionForDetail.submissionType}
          currentStatus={selectedSubmissionForDetail.status}
          onClose={() => {
            setShowDetailView(false);
            setSelectedSubmissionForDetail(null);
          }}
          onDownload={() => {
            handleDownload(
              selectedSubmissionForDetail.id,
              selectedSubmissionForDetail.employeeName,
              "csv",
            );
          }}
          onApprove={
            selectedSubmissionForDetail.status === "Pending"
              ? () => {
                  handleApprove(selectedSubmissionForDetail.id);
                  setShowDetailView(false);
                  setSelectedSubmissionForDetail(null);
                }
              : undefined
          }
          onReturn={
            selectedSubmissionForDetail.status === "Pending"
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
        <ReviewDialog
          employeeName={selectedSubmission.employeeName}
          submissionData={selectedSubmission.submissionData}
          onSubmit={(feedback) =>
            handleReturnForRevision(selectedSubmission.id, feedback)
          }
          onClose={() => setShowReviewDialog(false)}
        />
      )}

      {/* Connection Status Indicator */}
      {connectionStatus && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-white px-4 py-2 text-xs font-medium text-gray-700 border border-gray-200 shadow-sm">
          Supabase: {connectionStatus}
        </div>
      )}
    </div>
  );
}
