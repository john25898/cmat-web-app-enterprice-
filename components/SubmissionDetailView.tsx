"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Download,
  CheckCircle2,
  AlertCircle,
  Check,
  RotateCcw,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import {
  downloadSubmissionAsCSV,
  downloadSubmissionAsWord,
  downloadSubmissionAsPDF,
} from "@/lib/downloadUtils";

interface FacilityRow {
  id: string;
  date: string;
  facility: string;
  activity: string;
  objectives: string;
  budget: number;
}

interface SubmissionDetailViewProps {
  submission: Record<string, unknown>;
  submissionType: "Workplan" | "Report";
  currentStatus?: string;
  onClose: () => void;
  onDownload: () => void;
  onApprove?: () => void;
  onReturn?: (feedback: string) => void;
}

export default function SubmissionDetailView({
  submission,
  submissionType,
  currentStatus,
  onClose,
  onDownload,
  onApprove,
  onReturn,
}: SubmissionDetailViewProps) {
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        downloadRef.current &&
        !downloadRef.current.contains(e.target as Node)
      ) {
        setShowDownloadMenu(false);
      }
    };
    if (showDownloadMenu) {
      document.addEventListener("click", handler);
      return () => document.removeEventListener("click", handler);
    }
  }, [showDownloadMenu]);

  const handleFormatDownload = async (format: "csv" | "word" | "pdf") => {
    setShowDownloadMenu(false);
    if (format === "csv") {
      downloadSubmissionAsCSV(submission, submissionType);
    } else if (format === "word") {
      downloadSubmissionAsWord(submission, submissionType);
    } else if (format === "pdf") {
      await downloadSubmissionAsPDF(submission, submissionType);
    }
  };

  const signatureName = submission.signatureName as string;
  const isCertified = submission.isCertified as boolean;
  const facilities = submission.facilities as FacilityRow[] | undefined;

  const handleReturnSubmit = () => {
    if (!feedback.trim()) {
      alert("Please provide feedback before returning");
      return;
    }
    onReturn?.(feedback);
    setShowReturnForm(false);
    setFeedback("");
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-sky-50 to-sky-100 border-b border-sky-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-sky-900">
              {submissionType} Submission Details
            </h2>
            <p className="text-sm text-sky-700 mt-1">
              From: {submission.employeeName || submission.officerName}
              {currentStatus && (
                <span
                  className={`ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeColor(currentStatus)}`}
                >
                  {currentStatus}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 relative" ref={downloadRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDownloadMenu(!showDownloadMenu);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            {showDownloadMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-lg">
                <button
                  onClick={() => handleFormatDownload("csv")}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-sky-50"
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  CSV (.csv)
                </button>
                <button
                  onClick={() => handleFormatDownload("word")}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-sky-50"
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  Word (.doc)
                </button>
                <button
                  onClick={() => handleFormatDownload("pdf")}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-sky-50"
                >
                  <FileText className="h-4 w-4 text-red-600" />
                  PDF (.pdf)
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-sky-200 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Header Information */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {submission.region && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-600 mb-1">Region</p>
                <p className="text-sm font-semibold text-gray-900">
                  {submission.region}
                </p>
              </div>
            )}
            {submission.officerName && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-600 mb-1">
                  Officer Name
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {submission.officerName}
                </p>
              </div>
            )}
            {submission.designation && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-600 mb-1">
                  Designation
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {submission.designation}
                </p>
              </div>
            )}
            {submission.date && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-600 mb-1">Date</p>
                <p className="text-sm font-semibold text-gray-900">
                  {submission.date}
                </p>
              </div>
            )}
          </div>

          {/* Workplan Specific Section */}
          {submissionType === "Workplan" &&
            facilities &&
            facilities.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Facilities & Activities
                </h3>
                <div className="space-y-4">
                  {facilities.map((facility, idx) => (
                    <div
                      key={facility.id}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <h4 className="font-semibold text-gray-900 mb-3">
                        Facility {idx + 1}
                      </h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">
                            Date
                          </p>
                          <p className="text-sm text-gray-900">
                            {facility.date}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">
                            Facility Visited
                          </p>
                          <p className="text-sm text-gray-900">
                            {facility.facility}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-600 mb-1">
                          Planned Activity
                        </p>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {facility.activity}
                        </p>
                      </div>
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-600 mb-1">
                          Thematic Area / Objectives
                        </p>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {facility.objectives}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2">
                        <p className="text-xs font-medium text-sky-700">
                          Budget
                        </p>
                        <p className="text-sm font-bold text-sky-900">
                          USD {facility.budget.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Budget */}
                {facilities.length > 0 && (
                  <div className="mt-4 rounded-lg bg-sky-100 px-4 py-3 border-l-4 border-sky-600">
                    <p className="text-xs font-medium text-sky-700">
                      Total Budget
                    </p>
                    <p className="text-2xl font-bold text-sky-900">
                      USD{" "}
                      {facilities
                        .reduce((sum, f) => sum + f.budget, 0)
                        .toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}

          {/* Report Specific Section */}
          {submissionType === "Report" && (
            <div className="space-y-4">
              {submission.facility && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Facility
                  </p>
                  <p className="text-sm text-gray-900">{submission.facility}</p>
                </div>
              )}
              {submission.objectives && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Objectives
                  </p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {submission.objectives}
                  </p>
                </div>
              )}
              {submission.findings && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Key Findings
                  </p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {submission.findings}
                  </p>
                </div>
              )}
              {submission.actionPoints && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Action Points
                  </p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {submission.actionPoints}
                  </p>
                </div>
              )}
              {submission.responsible && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Responsible Person
                  </p>
                  <p className="text-sm text-gray-900">
                    {submission.responsible}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Digital Signature Section */}
          {signatureName && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Digital Signature
              </h3>
              <div className="rounded border-2 border-sky-200 bg-white p-4 min-h-20 flex items-center justify-center mb-3">
                <div
                  className="text-3xl text-sky-600"
                  style={{
                    fontFamily: "var(--font-caveat), cursive",
                    letterSpacing: "0.5px",
                  }}
                >
                  {signatureName}
                </div>
              </div>
              {isCertified && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Digitally certified</span>
                </div>
              )}
            </div>
          )}

          {/* Additional Notes Section */}
          {submission.feedback && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">
                    Supervisor Feedback
                  </h3>
                  <p className="text-sm text-amber-800 whitespace-pre-wrap">
                    {submission.feedback}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Approve / Return Actions */}
          {(onApprove || onReturn) && !showReturnForm && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Review Actions
              </h3>
              <div className="flex gap-3">
                {onApprove && (
                  <button
                    onClick={onApprove}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
                  >
                    <Check className="h-4 w-4" />
                    Approve Submission
                  </button>
                )}
                {onReturn && (
                  <button
                    onClick={() => setShowReturnForm(true)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Return for Revision
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Return Feedback Form */}
          {showReturnForm && onReturn && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h3 className="text-sm font-semibold text-red-900 mb-2">
                Return for Revision
              </h3>
              <p className="text-xs text-red-700 mb-3">
                Provide guidance for the employee to revise their submission.
              </p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Enter your feedback and guidance notes here..."
                rows={4}
                className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => {
                    setShowReturnForm(false);
                    setFeedback("");
                  }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReturnSubmit}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  Return to Employee
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
