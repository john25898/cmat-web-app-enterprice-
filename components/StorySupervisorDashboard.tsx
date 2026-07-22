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
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StorySubmission {
  id: string;
  projectName: string;
  submittedBy: string;
  submittedAt: string;
  status: "pending" | "approved" | "returned";
  reviewedAt: string | null;
  reviewFeedback: string | null;
  // All form fields
  [key: string]: unknown;
}

interface StorySupervisorDashboardProps {
  userEmail: string;
  onLogout: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadSubmissions(): StorySubmission[] {
  try {
    return JSON.parse(
      localStorage.getItem("chak-story-submissions") || "[]",
    ) as StorySubmission[];
  } catch {
    return [];
  }
}

function saveSubmissions(subs: StorySubmission[]) {
  localStorage.setItem("chak-story-submissions", JSON.stringify(subs));
}

function statusBadgeColor(status: string) {
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
}

function getSectionIcon(type: string) {
  const iconMap: Record<string, string> = {
    projectName: "📋",
    whatHappened: "📖",
    activityTookPlace: "📌",
    whoInvolved: "👥",
    whereHappened: "📍",
    whenHappened: "📅",
    howHappened: "🔧",
    whyImportant: "💡",
    hasBeneficiaryStory: "❤️",
    beneficiaryName: "👤",
    directQuote: "💬",
    chakPriorities: "🎯",
    keyMessages: "📢",
    photoCount: "📸",
    hasVideoClips: "🎥",
    numPeopleReached: "📊",
    numFacilitiesSupported: "🏥",
    fundingPartners: "🤝",
    governmentCollaborators: "🏛️",
    consentConfirmed: "✅",
    reportingOfficer: "📝",
  };
  return iconMap[type] || "•";
}

function friendlyLabel(key: string): string {
  const map: Record<string, string> = {
    projectName: "Project Name",
    isCampaign: "Part of Campaign",
    campaignSpecify: "Campaign Details",
    whatHappened: "What Happened",
    activityTookPlace: "Activity",
    whoInvolved: "Who Was Involved",
    whereHappened: "Location",
    whenHappened: "Date",
    howHappened: "How It Happened",
    whyImportant: "Why Important",
    numBeneficiaries: "Beneficiaries (Number)",
    typeBeneficiaries: "Beneficiary Type",
    vulnerableGroups: "Vulnerable Groups",
    problemAddressed: "Problem Addressed",
    improvementSeen: "Improvement Seen",
    longTermDifference: "Long-Term Difference",
    dataStats: "Data/Statistics",
    beforeAfter: "Before vs After",
    hasBeneficiaryStory: "Has Beneficiary Story",
    beneficiaryName: "Beneficiary Name",
    beneficiaryAge: "Beneficiary Age",
    beneficiaryLocation: "Beneficiary Location",
    situationBefore: "Situation Before",
    howSupported: "How Supported",
    whatChanged: "What Changed",
    directQuote: "Direct Quote",
    chakPriorities: "CHAK Priorities",
    keyMessages: "Key Messages",
    photoCount: "Photo Count",
    hasVideoClips: "Has Video Clips",
    videoDuration: "Video Duration",
    photoLighting: "Good Lighting",
    photoAction: "Action Shots",
    photoBeneficiaries: "Beneficiaries Engaged",
    photoConsent: "Consent Obtained",
    photoCaptions: "Photo Captions",
    numPeopleReached: "People Reached",
    numFacilitiesSupported: "Facilities Supported",
    suppliesDistributed: "Supplies Distributed",
    healthWorkersTrained: "Health Workers Trained",
    servicesDelivered: "Services Delivered",
    costSavings: "Cost Savings",
    otherMetrics: "Other Metrics",
    fundingPartners: "Funding Partners",
    governmentCollaborators: "Government Collaborators",
    otherStakeholders: "Other Stakeholders",
    consentConfirmed: "Consent Confirmed",
    reportingOfficer: "Reporting Officer",
    officerTitle: "Officer Title",
    mobileNo: "Mobile Number",
    date: "Date",
  };
  return map[key] || key;
}

// ─── Review Dialog (for return feedback) ──────────────────────────────────────

function StoryReviewDialog({
  projectName,
  onSubmit,
  onClose,
}: {
  projectName: string;
  onSubmit: (feedback: string) => void;
  onClose: () => void;
}) {
  const [feedback, setFeedback] = useState("");

  const handleSubmit = () => {
    if (!feedback.trim()) {
      alert("Please provide feedback before returning");
      return;
    }
    onSubmit(feedback);
  };

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
            <span className="font-medium">{projectName}</span> to revise their
            story submission.
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Enter your feedback and guidance notes here..."
            rows={4}
            className="mt-3 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
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
            onClick={handleSubmit}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail View Modal ────────────────────────────────────────────────────────

function StoryDetailView({
  submission,
  onClose,
  onDownload,
  onApprove,
  onReturn,
}: {
  submission: StorySubmission;
  onClose: () => void;
  onDownload: () => void;
  onApprove?: () => void;
  onReturn?: (feedback: string) => void;
}) {
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

  const sectionOrder = [
    {
      title: "Basic Information",
      keys: ["projectName", "isCampaign", "campaignSpecify"],
    },
    {
      title: "Story Summary",
      keys: [
        "whatHappened",
        "activityTookPlace",
        "whoInvolved",
        "whereHappened",
        "whenHappened",
        "howHappened",
        "whyImportant",
        "numBeneficiaries",
        "typeBeneficiaries",
        "vulnerableGroups",
        "problemAddressed",
        "improvementSeen",
        "longTermDifference",
        "dataStats",
        "beforeAfter",
      ],
    },
    {
      title: "Human Interest",
      keys: [
        "hasBeneficiaryStory",
        "beneficiaryName",
        "beneficiaryAge",
        "beneficiaryLocation",
        "situationBefore",
        "howSupported",
        "whatChanged",
        "directQuote",
      ],
    },
    { title: "Key Messages", keys: ["chakPriorities", "keyMessages"] },
    {
      title: "Visual Content",
      keys: [
        "photoCount",
        "hasVideoClips",
        "videoDuration",
        "photoLighting",
        "photoAction",
        "photoBeneficiaries",
        "photoConsent",
        "photoCaptions",
      ],
    },
    {
      title: "Numbers That Matter",
      keys: [
        "numPeopleReached",
        "numFacilitiesSupported",
        "suppliesDistributed",
        "healthWorkersTrained",
        "servicesDelivered",
        "costSavings",
        "otherMetrics",
      ],
    },
    {
      title: "Tagging & Partners",
      keys: ["fundingPartners", "governmentCollaborators", "otherStakeholders"],
    },
    {
      title: "Consent & Approval",
      keys: [
        "consentConfirmed",
        "reportingOfficer",
        "officerTitle",
        "mobileNo",
        "date",
      ],
    },
  ];

  const displayStatus =
    submission.status === "pending"
      ? "Pending"
      : submission.status === "approved"
        ? "Approved"
        : submission.status === "returned"
          ? "Returned"
          : "Pending";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-lg">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {submission.projectName || "Untitled Story"}
            </h2>
            <p className="text-xs text-gray-500">
              Submitted by {submission.submittedBy} &middot;{" "}
              {new Date(submission.submittedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Download dropdown */}
            <div className="relative" ref={downloadRef}>
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
              {showDownloadMenu && (
                <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-gray-200 bg-white shadow-lg">
                  <button
                    onClick={() => {
                      setShowDownloadMenu(false);
                      onDownload();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-sky-50"
                  >
                    <FileText className="h-4 w-4 text-gray-600" />
                    Summary
                  </button>
                  <button
                    onClick={() => {
                      setShowDownloadMenu(false);
                      onDownload();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-sky-50"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    Full Report
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {sectionOrder.map((section) => {
            const hasAny = section.keys.some(
              (k) =>
                submission[k] !== undefined &&
                submission[k] !== "" &&
                submission[k] !== false,
            );
            if (!hasAny) return null;
            return (
              <div key={section.title} className="mb-5">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                  {section.title}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {section.keys.map((k) => {
                    const val = submission[k];
                    if (val === undefined || val === "" || val === false)
                      return null;
                    return (
                      <div
                        key={k}
                        className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2"
                      >
                        <span className="mt-0.5 shrink-0 text-sm">
                          {getSectionIcon(k)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-500">
                            {friendlyLabel(k)}
                          </p>
                          <p className="truncate text-sm text-gray-900">
                            {typeof val === "boolean" ? "Yes" : String(val)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        {displayStatus === "Pending" && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
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
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                >
                  <Check className="h-4 w-4" />
                  Approve
                </button>
              </>
            ) : (
              <div className="flex w-full flex-col gap-3">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe what needs to be revised..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
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
                      if (feedback.trim()) {
                        onReturn?.(feedback.trim());
                      }
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

        {/* Already reviewed badge */}
        {displayStatus !== "Pending" && (
          <div className="flex shrink-0 items-center gap-2 border-t border-gray-100 px-6 py-4">
            {displayStatus === "Approved" ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Approved
                </span>
                {submission.reviewedAt && (
                  <span className="text-xs text-gray-400">
                    on {new Date(submission.reviewedAt).toLocaleDateString()}
                  </span>
                )}
              </>
            ) : (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function StorySupervisorDashboard({
  userEmail,
  onLogout,
}: StorySupervisorDashboardProps) {
  const [submissions, setSubmissions] = useState<StorySubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSubmissionForDetail, setSelectedSubmissionForDetail] =
    useState<StorySubmission | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [openDownloadId, setOpenDownloadId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const downloadRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    const data = loadSubmissions();
    // Ensure all submissions have a status (legacy support)
    data.forEach((s) => {
      if (!s.status) s.status = "pending";
    });
    // Sort newest first
    data.sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
    setSubmissions(data);
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        downloadRef.current &&
        !downloadRef.current.contains(e.target as Node)
      ) {
        setOpenDownloadId(null);
      }
    };
    if (openDownloadId) {
      document.addEventListener("click", handler);
      return () => document.removeEventListener("click", handler);
    }
  }, [openDownloadId]);

  const selectedSubmission = submissions.find((s) => s.id === selectedId);

  const handleApprove = (id: string) => {
    const all = loadSubmissions();
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) return;
    all[idx].status = "approved";
    all[idx].reviewedAt = new Date().toISOString();
    all[idx].reviewFeedback = null;
    saveSubmissions(all);
    refresh();
    setToastMessage("✓ Story approved successfully");
  };

  const handleReturnForRevision = (id: string, feedback: string) => {
    const all = loadSubmissions();
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) return;
    all[idx].status = "returned";
    all[idx].reviewedAt = new Date().toISOString();
    all[idx].reviewFeedback = feedback;
    saveSubmissions(all);
    refresh();
    setSelectedId(null);
    setToastMessage(`Story returned for revision`);
  };

  const handleDownload = (id: string, projectName: string, format: string) => {
    setOpenDownloadId(null);
    const sub = submissions.find((s) => s.id === id);
    if (!sub) return;

    const createdAt = new Date(sub.submittedAt).toISOString().split("T")[0];
    const filename = `CHAK_Story_${projectName.replace(/\s+/g, "_")}_${createdAt}`;

    if (format === "txt" || format === "summary") {
      const header = `CHAK STORY AND CONTENT CAPTURE TOOL\nFor Projects, Programmes & MHUs\n\nSubmitted by: ${sub.submittedBy}\nDate: ${new Date(sub.submittedAt).toLocaleDateString("en-KE")}\nStatus: ${(sub.status || "pending").toUpperCase()}\n${"─".repeat(60)}\n\n`;
      const sectionsText = [
        `SECTION 1: BASIC INFORMATION\n${"─".repeat(40)}\nProject/Programme Name: ${sub.projectName || "—"}\nPart of larger campaign? ${sub.isCampaign || "—"}${sub.campaignSpecify ? `\nCampaign details: ${sub.campaignSpecify}` : ""}`,
        `\n\nSECTION 2: STORY SUMMARY\n${"─".repeat(40)}\nWhat happened? ${sub.whatHappened || "—"}\nActivity: ${sub.activityTookPlace || "—"}\nWho: ${sub.whoInvolved || "—"}\nWhere: ${sub.whereHappened || "—"}\nHow: ${sub.howHappened || "—"}\nWhen: ${sub.whenHappened || "—"}\nWhy: ${sub.whyImportant || "—"}`,
        `\n\nSECTION 3: HUMAN INTEREST\n${"─".repeat(40)}\nBeneficiary story: ${sub.hasBeneficiaryStory === "Yes" ? `Yes\nName: ${sub.beneficiaryName || "—"}\nQuote: "${sub.directQuote || "—"}"` : "—"}`,
        `\n\nSECTION 4: KEY MESSAGES\n${"─".repeat(40)}\nPriorities: ${sub.chakPriorities || "—"}\nMessages: ${sub.keyMessages || "—"}`,
        `\n\nSECTION 5: VISUAL CONTENT\n${"─".repeat(40)}\nPhotos: ${sub.photoCount || "—"}\nVideo: ${sub.hasVideoClips || "—"}`,
        `\n\nSECTION 6: NUMBERS\n${"─".repeat(40)}\nPeople reached: ${sub.numPeopleReached || "—"}\nFacilities: ${sub.numFacilitiesSupported || "—"}`,
        `\n\nSECTION 7: TAGGING & PARTNERS\n${"─".repeat(40)}\nPartners: ${sub.fundingPartners || "—"}\nGovernment: ${sub.governmentCollaborators || "—"}`,
        `\n\nSECTION 8: CONSENT\n${"─".repeat(40)}\nConsent: ${sub.consentConfirmed ? "Yes" : "No"}\nOfficer: ${sub.reportingOfficer || "—"}\nMobile: ${sub.mobileNo || "—"}\nDate: ${sub.date || "—"}`,
      ];
      const fullText = header + sectionsText.join("");
      const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setToastMessage(`Downloaded "${projectName}" as TXT`);
    } else {
      // CSV format
      const rows: string[][] = [];
      const seen: Set<string> = new Set();
      const allKeys = Object.keys(sub).filter(
        (k) =>
          k !== "id" &&
          k !== "status" &&
          k !== "reviewedAt" &&
          k !== "reviewFeedback" &&
          sub[k] !== undefined &&
          sub[k] !== "" &&
          sub[k] !== false,
      );
      rows.push(["Field", "Value"]);
      allKeys.forEach((k) => {
        if (!seen.has(k)) {
          seen.add(k);
          const label = friendlyLabel(k);
          const val = typeof sub[k] === "boolean" ? "Yes" : String(sub[k]);
          rows.push([label, val]);
        }
      });
      const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setToastMessage(`Downloaded "${projectName}" as CSV`);
    }
  };

  const displayStatus = (s: StorySubmission) =>
    s.status === "pending"
      ? "Pending"
      : s.status === "approved"
        ? "Approved"
        : s.status === "returned"
          ? "Returned"
          : "Pending";

  // ── Render ──

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Story Supervisor Dashboard
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

      {/* Toast */}
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
                Story Submissions Monitor
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                All story submissions from field officers
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-gray-500">Loading submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-20">
                <p className="text-gray-500">
                  No stories submitted yet. Submissions will appear here once
                  field officers submit them.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                        Project / Story Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                        Submitted By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                        Date Submitted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                        County / Location
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
                            {row.projectName || (
                              <span className="italic text-gray-400">
                                Untitled Story
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {row.submittedBy}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          Story
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {new Date(row.submittedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {(row.whereHappened as string) || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeColor(displayStatus(row))}`}
                          >
                            {displayStatus(row)}
                          </span>
                        </td>
                        <td className="relative px-6 py-4 text-center">
                          <div ref={downloadRef}>
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
                                      row.projectName || "Story",
                                      "summary",
                                    );
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-sky-50"
                                >
                                  <FileText className="h-4 w-4 text-blue-600" />
                                  Summary (TXT)
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(
                                      row.id,
                                      row.projectName || "Story",
                                      "csv",
                                    );
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-sky-50"
                                >
                                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                  Full Data (CSV)
                                </button>
                              </div>
                            )}
                          </div>
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
              {selectedSubmission.projectName || "Untitled Story"}
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Type
                </p>
                <p className="mt-1 text-sm text-gray-900">Story</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Submitted By
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedSubmission.submittedBy}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  County / Location
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {(selectedSubmission.whereHappened as string) || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Date Submitted
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(
                    selectedSubmission.submittedAt,
                  ).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </p>
                <span
                  className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeColor(displayStatus(selectedSubmission))}`}
                >
                  {displayStatus(selectedSubmission)}
                </span>
              </div>

              {/* Action Buttons */}
              {displayStatus(selectedSubmission) === "Pending" && (
                <div className="space-y-2 pt-4">
                  <button
                    onClick={() => handleApprove(selectedSubmission.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
                  >
                    <Check className="h-4 w-4" />
                    Approve Submission
                  </button>

                  <button
                    onClick={() => setShowReviewDialog(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-50"
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
        <StoryDetailView
          submission={selectedSubmissionForDetail}
          onClose={() => {
            setShowDetailView(false);
            setSelectedSubmissionForDetail(null);
          }}
          onDownload={() => {
            handleDownload(
              selectedSubmissionForDetail.id,
              selectedSubmissionForDetail.projectName || "Story",
              "summary",
            );
          }}
          onApprove={
            displayStatus(selectedSubmissionForDetail) === "Pending"
              ? () => {
                  handleApprove(selectedSubmissionForDetail.id);
                  setShowDetailView(false);
                  setSelectedSubmissionForDetail(null);
                }
              : undefined
          }
          onReturn={
            displayStatus(selectedSubmissionForDetail) === "Pending"
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
        <StoryReviewDialog
          projectName={selectedSubmission.projectName || "Untitled Story"}
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
