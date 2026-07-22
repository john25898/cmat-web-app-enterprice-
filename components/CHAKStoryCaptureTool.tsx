"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Send,
  Camera,
  Heart,
  MessageSquare,
  BarChart3,
  Users,
  FileCheck,
  Info,
  ImageIcon,
  Clock,
  MapPin,
  User,
  Quote,
  Save,
  Download,
  LogOut,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormData {
  // Section 1: Basic Info
  projectName: string;
  isCampaign: string;
  campaignSpecify: string;

  // Section 2: Story Summary
  whatHappened: string;
  activityTookPlace: string;
  whoInvolved: string;
  whereHappened: string;
  howHappened: string;
  whenHappened: string;
  whyImportant: string;
  numBeneficiaries: string;
  typeBeneficiaries: string;
  vulnerableGroups: string;
  problemAddressed: string;
  improvementSeen: string;
  longTermDifference: string;
  dataStats: string;
  beforeAfter: string;

  // Section 3: Human Interest
  hasBeneficiaryStory: string;
  beneficiaryName: string;
  beneficiaryAge: string;
  beneficiaryLocation: string;
  situationBefore: string;
  howSupported: string;
  whatChanged: string;
  directQuote: string;

  // Section 4: Key Messages
  chakPriorities: string;
  keyMessages: string;

  // Section 5: Visual Content
  photoCount: string;
  hasVideoClips: string;
  videoDuration: string;
  photoLighting: boolean;
  photoAction: boolean;
  photoBeneficiaries: boolean;
  photoConsent: boolean;
  photoCaptions: string;

  // Section 6: Numbers
  numPeopleReached: string;
  numFacilitiesSupported: string;
  suppliesDistributed: string;
  healthWorkersTrained: string;
  servicesDelivered: string;
  costSavings: string;
  otherMetrics: string;

  // Section 7: Tagging
  fundingPartners: string;
  governmentCollaborators: string;
  otherStakeholders: string;

  // Section 8: Consent
  consentConfirmed: boolean;
  reportingOfficer: string;
  officerTitle: string;
  mobileNo: string;
  date: string;
}

const defaultFormData: FormData = {
  projectName: "",
  isCampaign: "",
  campaignSpecify: "",
  whatHappened: "",
  activityTookPlace: "",
  whoInvolved: "",
  whereHappened: "",
  howHappened: "",
  whenHappened: "",
  whyImportant: "",
  numBeneficiaries: "",
  typeBeneficiaries: "",
  vulnerableGroups: "",
  problemAddressed: "",
  improvementSeen: "",
  longTermDifference: "",
  dataStats: "",
  beforeAfter: "",
  hasBeneficiaryStory: "",
  beneficiaryName: "",
  beneficiaryAge: "",
  beneficiaryLocation: "",
  situationBefore: "",
  howSupported: "",
  whatChanged: "",
  directQuote: "",
  chakPriorities: "",
  keyMessages: "",
  photoCount: "",
  hasVideoClips: "",
  videoDuration: "",
  photoLighting: false,
  photoAction: false,
  photoBeneficiaries: false,
  photoConsent: false,
  photoCaptions: "",
  numPeopleReached: "",
  numFacilitiesSupported: "",
  suppliesDistributed: "",
  healthWorkersTrained: "",
  servicesDelivered: "",
  costSavings: "",
  otherMetrics: "",
  fundingPartners: "",
  governmentCollaborators: "",
  otherStakeholders: "",
  consentConfirmed: false,
  reportingOfficer: "",
  officerTitle: "",
  mobileNo: "",
  date: new Date().toISOString().split("T")[0],
};

// ─── Section Definitions ─────────────────────────────────────────────────────

interface Section {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}

const sections: Section[] = [
  {
    id: 1,
    title: "Basic Information",
    subtitle: "Project & campaign details",
    icon: <Info className="h-5 w-5" />,
    color: "from-teal-500 to-emerald-600",
  },
  {
    id: 2,
    title: "Story Summary",
    subtitle: "Core content & impact",
    icon: <Clock className="h-5 w-5" />,
    color: "from-sky-500 to-blue-600",
  },
  {
    id: 3,
    title: "Human Interest",
    subtitle: "Beneficiary stories & quotes",
    icon: <Heart className="h-5 w-5" />,
    color: "from-rose-500 to-pink-600",
  },
  {
    id: 4,
    title: "Key Messages",
    subtitle: "Priorities & takeaways",
    icon: <MessageSquare className="h-5 w-5" />,
    color: "from-amber-500 to-orange-600",
  },
  {
    id: 5,
    title: "Visual Content",
    subtitle: "Photos, videos & captions",
    icon: <Camera className="h-5 w-5" />,
    color: "from-purple-500 to-violet-600",
  },
  {
    id: 6,
    title: "Numbers That Matter",
    subtitle: "Metrics & measurable results",
    icon: <BarChart3 className="h-5 w-5" />,
    color: "from-cyan-500 to-teal-600",
  },
  {
    id: 7,
    title: "Tagging & Partners",
    subtitle: "Collaborators & acknowledgments",
    icon: <Users className="h-5 w-5" />,
    color: "from-indigo-500 to-blue-600",
  },
  {
    id: 8,
    title: "Consent & Approval",
    subtitle: "Sign-off & submission",
    icon: <FileCheck className="h-5 w-5" />,
    color: "from-emerald-500 to-green-600",
  },
];

// ─── Sub-Component: Progress Sidebar ────────────────────────────────────────

function Sidebar({
  currentStep,
  completedSections,
  onNavigate,
}: {
  currentStep: number;
  completedSections: Set<number>;
  onNavigate: (step: number) => void;
}) {
  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-6 space-y-1.5">
        <div className="mb-6 px-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Sections
          </h2>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
              style={{
                width: `${(currentStep / (sections.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>
        {sections.map((s, idx) => {
          const isActive = currentStep === idx;
          const isCompleted = completedSections.has(idx);
          return (
            <button
              key={s.id}
              onClick={() => onNavigate(idx)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-all ${
                isActive
                  ? "bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200"
                  : isCompleted
                    ? "text-gray-600 hover:bg-gray-50"
                    : "text-gray-400 hover:bg-gray-50"
              }`}
            >
              {/* Step number or check */}
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isActive
                      ? "bg-teal-500 text-white"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : s.id}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate font-medium ${
                    isActive ? "text-teal-700" : ""
                  }`}
                >
                  {s.title}
                </p>
                <p className="truncate text-xs text-gray-400">{s.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// ─── Sub-Component: Section Card ────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  subtitle,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 rounded-2xl border border-gray-100 bg-white shadow-sm duration-300">
      {/* Header */}
      <div className={`rounded-t-2xl bg-gradient-to-r ${color} px-6 py-5`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="text-sm text-white/80">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-5 px-6 py-6">{children}</div>
    </div>
  );
}

// ─── Sub-Component: Form Field ──────────────────────────────────────────────

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  rows,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  if (rows) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
    />
  );
}

function RadioGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="flex gap-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
            value === opt.value
              ? "border-teal-400 bg-teal-50 text-teal-700 ring-1 ring-teal-200"
              : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 transition-colors hover:bg-gray-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface CHAKStoryCaptureToolProps {
  userEmail: string;
  onLogout: () => void;
}

export default function CHAKStoryCaptureTool({
  userEmail,
  onLogout,
}: CHAKStoryCaptureToolProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(defaultFormData);
  const [completedSections, setCompletedSections] = useState<Set<number>>(
    new Set(),
  );
  const [submitted, setSubmitted] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Load saved draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem("chak-story-draft");
      if (saved) {
        const parsed = JSON.parse(saved) as FormData;
        setForm(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem("chak-story-draft", JSON.stringify(form));
    }, 2000);
    return () => clearTimeout(timer);
  }, [form]);

  // Scroll to top on step change
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [step]);

  const update = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const goTo = (s: number) => {
    if (s >= 0 && s < sections.length) {
      setStep(s);
    }
  };

  const markComplete = (s: number) => {
    setCompletedSections((prev) => {
      const next = new Set(prev);
      next.add(s);
      return next;
    });
  };

  const handleNext = () => {
    markComplete(step);
    if (step < sections.length - 1) {
      goTo(step + 1);
    }
  };

  const handleSubmit = () => {
    markComplete(7);
    // Save final submission with id & status for supervisor review
    const submissions = JSON.parse(
      localStorage.getItem("chak-story-submissions") || "[]",
    );
    submissions.push({
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2),
      ...form,
      submittedAt: new Date().toISOString(),
      submittedBy: userEmail,
      status: "pending",
      reviewedAt: null,
      reviewFeedback: null,
    });
    localStorage.setItem("chak-story-submissions", JSON.stringify(submissions));
    setSubmitted(true);
  };

  const handleDownload = () => {
    const header = `CHAK STORY AND CONTENT CAPTURE TOOL\nFor Projects, Programmes & MHUs\n\nSubmitted by: ${userEmail}\nDate: ${new Date().toLocaleDateString()}\n${"─".repeat(60)}\n\n`;

    const sectionsText = [
      `SECTION 1: BASIC INFORMATION\n${"─".repeat(40)}\nProject/Programme Name: ${form.projectName || "—"}\nPart of larger campaign? ${form.isCampaign || "—"}${form.campaignSpecify ? `\nCampaign details: ${form.campaignSpecify}` : ""}`,
      `\n\nSECTION 2: STORY SUMMARY (CORE CONTENT)\n${"─".repeat(40)}\nWhat happened? ${form.whatHappened || "—"}\nActivity: ${form.activityTookPlace || "—"}\nWho was involved? ${form.whoInvolved || "—"}\nWhere? ${form.whereHappened || "—"}\nHow? ${form.howHappened || "—"}\nWhen? ${form.whenHappened || "—"}\nWhy important? ${form.whyImportant || "—"}\n\nBeneficiaries: ${form.numBeneficiaries || "—"}\nType: ${form.typeBeneficiaries || "—"}\nVulnerable groups: ${form.vulnerableGroups || "—"}\n\nProblem addressed: ${form.problemAddressed || "—"}\nImprovement: ${form.improvementSeen || "—"}\nLong-term difference: ${form.longTermDifference || "—"}\nData/Statistics: ${form.dataStats || "—"}\nBefore/After: ${form.beforeAfter || "—"}`,
      `\n\nSECTION 3: HUMAN INTEREST STORY\n${"─".repeat(40)}\nHas beneficiary story? ${form.hasBeneficiaryStory || "—"}${form.hasBeneficiaryStory === "Yes" ? `\nName: ${form.beneficiaryName || "—"}\nAge: ${form.beneficiaryAge || "—"}\nLocation: ${form.beneficiaryLocation || "—"}\nSituation before: ${form.situationBefore || "—"}\nHow CHAK supported: ${form.howSupported || "—"}\nWhat changed: ${form.whatChanged || "—"}\nDirect quote: "${form.directQuote || "—"}"` : ""}`,
      `\n\nSECTION 4: KEY MESSAGES\n${"─".repeat(40)}\nCHAK priorities supported: ${form.chakPriorities || "—"}\nKey messages: ${form.keyMessages || "—"}`,
      `\n\nSECTION 5: VISUAL CONTENT\n${"─".repeat(40)}\nNumber of photos: ${form.photoCount || "—"}\nHas video clips? ${form.hasVideoClips || "—"}${form.hasVideoClips === "Yes" ? `\nDuration: ${form.videoDuration || "—"}` : ""}\nPhoto checklist:\n  ✓ Clear lighting: ${form.photoLighting ? "Yes" : "No"}\n  ✓ Action shots: ${form.photoAction ? "Yes" : "No"}\n  ✓ Beneficiaries engaged: ${form.photoBeneficiaries ? "Yes" : "No"}\n  ✓ Consent obtained: ${form.photoConsent ? "Yes" : "No"}\nPhoto captions: ${form.photoCaptions || "—"}`,
      `\n\nSECTION 6: NUMBERS THAT MATTER\n${"─".repeat(40)}\nPeople reached: ${form.numPeopleReached || "—"}\nFacilities supported: ${form.numFacilitiesSupported || "—"}\nSupplies distributed: ${form.suppliesDistributed || "—"}\nHealth workers trained: ${form.healthWorkersTrained || "—"}\nServices delivered: ${form.servicesDelivered || "—"}\nCost savings: ${form.costSavings || "—"}\nOther metrics: ${form.otherMetrics || "—"}`,
      `\n\nSECTION 7: TAGGING & PARTNERS\n${"─".repeat(40)}\nFunding/Implementing partners: ${form.fundingPartners || "—"}\nGovernment collaborators: ${form.governmentCollaborators || "—"}\nOther stakeholders: ${form.otherStakeholders || "—"}`,
      `\n\nSECTION 8: CONSENT & APPROVAL\n${"─".repeat(40)}\nConsent confirmed: ${form.consentConfirmed ? "Yes" : "No"}\nReporting Officer: ${form.reportingOfficer || "—"}\nTitle: ${form.officerTitle || "—"}\nMobile: ${form.mobileNo || "—"}\nDate: ${form.date || "—"}`,
    ];

    const fullText = header + sectionsText.join("");

    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CHAK_Story_${form.projectName || "Submission"}_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveDraft = () => {
    localStorage.setItem("chak-story-draft", JSON.stringify(form));
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2000);
  };

  // ── Render Step Content ────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      // ── SECTION 1: Basic Information ──
      case 0:
        return (
          <SectionCard
            icon={<Info className="h-5 w-5" />}
            title="Basic Information"
            subtitle="Project & campaign details"
            color="from-teal-500 to-emerald-600"
          >
            <Field label="Project/Programme Name" required>
              <TextInput
                value={form.projectName}
                onChange={(v) => update("projectName", v)}
                placeholder="e.g., Community Health Strengthening Program"
              />
            </Field>
            <Field label="Is this activity part of a larger campaign/event?">
              <RadioGroup
                value={form.isCampaign}
                onChange={(v) => update("isCampaign", v)}
                options={[
                  { label: "Yes", value: "Yes" },
                  { label: "No", value: "No" },
                ]}
              />
            </Field>
            {form.isCampaign === "Yes" && (
              <Field label="If yes, specify campaign/event">
                <TextInput
                  value={form.campaignSpecify}
                  onChange={(v) => update("campaignSpecify", v)}
                  placeholder="e.g., World AIDS Day 2026"
                />
              </Field>
            )}
          </SectionCard>
        );

      // ── SECTION 2: Story Summary ──
      case 1:
        return (
          <SectionCard
            icon={<Clock className="h-5 w-5" />}
            title="Story Summary"
            subtitle="Core content & impact"
            color="from-sky-500 to-blue-600"
          >
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-700">
              <p className="font-medium">📝 Instructions</p>
              <p className="mt-1">
                Briefly describe what happened in 3–5 sentences. Cover the key
                activity, people involved, location, and why it matters.
              </p>
            </div>

            <Field label="What happened? (Brief description)" required>
              <TextInput
                value={form.whatHappened}
                onChange={(v) => update("whatHappened", v)}
                placeholder="Describe the activity in 3–5 sentences..."
                rows={3}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="What activity took place?" required>
                <TextInput
                  value={form.activityTookPlace}
                  onChange={(v) => update("activityTookPlace", v)}
                  placeholder="e.g., Health outreach, training..."
                />
              </Field>
              <Field label="Who was involved?" required>
                <TextInput
                  value={form.whoInvolved}
                  onChange={(v) => update("whoInvolved", v)}
                  placeholder="e.g., CHAK team, community health workers..."
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Where did it happen?" required>
                <TextInput
                  value={form.whereHappened}
                  onChange={(v) => update("whereHappened", v)}
                  placeholder="e.g., Meru County, MTRH..."
                />
              </Field>
              <Field label="When did it happen?" required>
                <TextInput
                  value={form.whenHappened}
                  onChange={(v) => update("whenHappened", v)}
                  placeholder="e.g., June 2026"
                />
              </Field>
            </div>

            <Field label="How did it happen? (Major happenings)" required>
              <TextInput
                value={form.howHappened}
                onChange={(v) => update("howHappened", v)}
                placeholder="e.g., A presentation by CHAK, handover of supplies, training sessions..."
                rows={2}
              />
            </Field>

            <Field label="Why is it important?" required>
              <TextInput
                value={form.whyImportant}
                onChange={(v) => update("whyImportant", v)}
                placeholder="What impact does this activity have?"
                rows={2}
              />
            </Field>

            <div className="border-t border-gray-100 pt-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-600">
                👥 Beneficiaries
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Number of beneficiaries">
                  <TextInput
                    value={form.numBeneficiaries}
                    onChange={(v) => update("numBeneficiaries", v)}
                    placeholder="e.g., 250"
                  />
                </Field>
                <Field label="Type of beneficiaries">
                  <TextInput
                    value={form.typeBeneficiaries}
                    onChange={(v) => update("typeBeneficiaries", v)}
                    placeholder="e.g., children, mothers, PLHIV..."
                  />
                </Field>
              </div>
              <Field label="Any special/vulnerable groups reached?">
                <TextInput
                  value={form.vulnerableGroups}
                  onChange={(v) => update("vulnerableGroups", v)}
                  placeholder="e.g., orphans, elderly, disabled persons..."
                />
              </Field>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-600">
                📊 What changed as a result?
              </h4>
              <Field label="What problem was addressed/is being addressed?">
                <TextInput
                  value={form.problemAddressed}
                  onChange={(v) => update("problemAddressed", v)}
                  placeholder="Describe the problem..."
                  rows={2}
                />
              </Field>
              <Field label="What improvement was seen/is expected?">
                <TextInput
                  value={form.improvementSeen}
                  onChange={(v) => update("improvementSeen", v)}
                  placeholder="Describe the improvement..."
                  rows={2}
                />
              </Field>
              <Field label="What difference will this make in the long term?">
                <TextInput
                  value={form.longTermDifference}
                  onChange={(v) => update("longTermDifference", v)}
                  placeholder="Long-term impact..."
                  rows={2}
                />
              </Field>
              <Field label="Data/Statistics (if available)">
                <TextInput
                  value={form.dataStats}
                  onChange={(v) => update("dataStats", v)}
                  placeholder="e.g., 95% of participants reported improved knowledge"
                  rows={2}
                />
              </Field>
              <Field label="Before vs After comparison">
                <TextInput
                  value={form.beforeAfter}
                  onChange={(v) => update("beforeAfter", v)}
                  placeholder="Photos or data showing before/after..."
                  rows={2}
                />
              </Field>
            </div>
          </SectionCard>
        );

      // ── SECTION 3: Human Interest Story ──
      case 2:
        return (
          <SectionCard
            icon={<Heart className="h-5 w-5" />}
            title="Human Interest Story"
            subtitle="Beneficiary stories & quotes"
            color="from-rose-500 to-pink-600"
          >
            <div className="rounded-lg border border-pink-100 bg-pink-50/50 p-3 text-xs text-pink-700">
              <p className="font-medium">💡 Tip</p>
              <p className="mt-1">
                Stories with real people create emotional connection. Always
                obtain consent before sharing names or photos.
              </p>
            </div>

            <Field label="Is there a specific beneficiary or health worker whose story can be shared?">
              <RadioGroup
                value={form.hasBeneficiaryStory}
                onChange={(v) => update("hasBeneficiaryStory", v)}
                options={[
                  { label: "Yes", value: "Yes" },
                  { label: "No", value: "No" },
                ]}
              />
            </Field>

            {form.hasBeneficiaryStory === "Yes" && (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Name (or anonymous)">
                    <TextInput
                      value={form.beneficiaryName}
                      onChange={(v) => update("beneficiaryName", v)}
                      placeholder="e.g., Mary Wanjiku"
                    />
                  </Field>
                  <Field label="Age">
                    <TextInput
                      value={form.beneficiaryAge}
                      onChange={(v) => update("beneficiaryAge", v)}
                      placeholder="e.g., 34"
                    />
                  </Field>
                  <Field label="Location">
                    <TextInput
                      value={form.beneficiaryLocation}
                      onChange={(v) => update("beneficiaryLocation", v)}
                      placeholder="e.g., Meru County"
                    />
                  </Field>
                </div>

                <Field label="Their situation before the intervention">
                  <TextInput
                    value={form.situationBefore}
                    onChange={(v) => update("situationBefore", v)}
                    placeholder="Describe the situation before CHAK's intervention..."
                    rows={3}
                  />
                </Field>

                <Field label="How CHAK/project supported them">
                  <TextInput
                    value={form.howSupported}
                    onChange={(v) => update("howSupported", v)}
                    placeholder="Describe the support provided..."
                    rows={3}
                  />
                </Field>

                <Field label="What has changed in their life/work">
                  <TextInput
                    value={form.whatChanged}
                    onChange={(v) => update("whatChanged", v)}
                    placeholder="Describe the positive change..."
                    rows={3}
                  />
                </Field>

                <Field label="Direct quote (very important)" required>
                  <div className="relative">
                    <Quote className="absolute left-3 top-3 h-5 w-5 text-pink-300" />
                    <TextInput
                      value={form.directQuote}
                      onChange={(v) => update("directQuote", v)}
                      placeholder='"Before this program, I had to travel 40 kilometres for treatment..."'
                      rows={3}
                    />
                  </div>
                </Field>
              </>
            )}
          </SectionCard>
        );

      // ── SECTION 4: Key Messages ──
      case 3:
        return (
          <SectionCard
            icon={<MessageSquare className="h-5 w-5" />}
            title="Key Messages"
            subtitle="Priorities & takeaways"
            color="from-amber-500 to-orange-600"
          >
            <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3 text-xs text-amber-700">
              <p className="font-medium">🎯 Purpose</p>
              <p className="mt-1">
                Identify which CHAK priorities this story supports and craft
                clear messages you want the public to remember.
              </p>
            </div>

            <Field
              label="Which CHAK priorities does this story support?"
              required
            >
              <TextInput
                value={form.chakPriorities}
                onChange={(v) => update("chakPriorities", v)}
                placeholder="e.g., Health systems strengthening, access to medicines..."
                rows={3}
              />
            </Field>

            <Field
              label="Provide 1–2 key messages you want the public to remember"
              required
            >
              <TextInput
                value={form.keyMessages}
                onChange={(v) => update("keyMessages", v)}
                placeholder="e.g., Faith-based facilities remain critical partners in delivering affordable healthcare..."
                rows={3}
              />
            </Field>
          </SectionCard>
        );

      // ── SECTION 5: Visual Content ──
      case 4:
        return (
          <SectionCard
            icon={<Camera className="h-5 w-5" />}
            title="Visual Content"
            subtitle="Photos, videos & captions"
            color="from-purple-500 to-violet-600"
          >
            <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-3 text-xs text-purple-700">
              <p className="font-medium">📸 Important</p>
              <p className="mt-1">
                Attach high-quality photos (min. 3–5) in JPEG/PNG format
                alongside this document when submitting. Do not embed photos in
                this document.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Number of photos attached">
                <TextInput
                  value={form.photoCount}
                  onChange={(v) => update("photoCount", v)}
                  placeholder="e.g., 5"
                />
              </Field>
              <Field label="Has short video clips? (30–60 sec)">
                <RadioGroup
                  value={form.hasVideoClips}
                  onChange={(v) => update("hasVideoClips", v)}
                  options={[
                    { label: "Yes", value: "Yes" },
                    { label: "No", value: "No" },
                  ]}
                />
              </Field>
            </div>

            {form.hasVideoClips === "Yes" && (
              <Field label="Video duration/notes">
                <TextInput
                  value={form.videoDuration}
                  onChange={(v) => update("videoDuration", v)}
                  placeholder="e.g., 3 clips of 45 seconds each"
                />
              </Field>
            )}

            <div className="border-t border-gray-100 pt-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-600">
                ✅ Photo Checklist
              </h4>
              <div className="space-y-2">
                <Checkbox
                  checked={form.photoLighting}
                  onChange={(v) => update("photoLighting", v)}
                  label="Clear lighting — photos are well-lit and visible"
                />
                <Checkbox
                  checked={form.photoAction}
                  onChange={(v) => update("photoAction", v)}
                  label="Action shots — not only posed photos"
                />
                <Checkbox
                  checked={form.photoBeneficiaries}
                  onChange={(v) => update("photoBeneficiaries", v)}
                  label="Show beneficiaries engaging in services"
                />
                <Checkbox
                  checked={form.photoConsent}
                  onChange={(v) => update("photoConsent", v)}
                  label="Signed photo/video consent obtained"
                />
              </div>
            </div>

            <Field label="Caption suggestion for each photo">
              <TextInput
                value={form.photoCaptions}
                onChange={(v) => update("photoCaptions", v)}
                placeholder="Write one line explaining what is happening in each photo..."
                rows={3}
              />
            </Field>
          </SectionCard>
        );

      // ── SECTION 6: Numbers That Matter ──
      case 5:
        return (
          <SectionCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="Numbers That Matter"
            subtitle="Metrics & measurable results"
            color="from-cyan-500 to-teal-600"
          >
            <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 p-3 text-xs text-cyan-700">
              <p className="font-medium">📊 Note</p>
              <p className="mt-1">
                Data makes posts credible and impactful. Include as many
                measurable results as possible.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Number of people reached (overall)">
                <TextInput
                  value={form.numPeopleReached}
                  onChange={(v) => update("numPeopleReached", v)}
                  placeholder="e.g., 5,000"
                />
              </Field>
              <Field label="Number of facilities supported">
                <TextInput
                  value={form.numFacilitiesSupported}
                  onChange={(v) => update("numFacilitiesSupported", v)}
                  placeholder="e.g., 12"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Supplies distributed">
                <TextInput
                  value={form.suppliesDistributed}
                  onChange={(v) => update("suppliesDistributed", v)}
                  placeholder="e.g., 500 mosquito nets"
                />
              </Field>
              <Field label="Health workers trained">
                <TextInput
                  value={form.healthWorkersTrained}
                  onChange={(v) => update("healthWorkersTrained", v)}
                  placeholder="e.g., 45"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Services delivered">
                <TextInput
                  value={form.servicesDelivered}
                  onChange={(v) => update("servicesDelivered", v)}
                  placeholder="e.g., 200 consultations"
                />
              </Field>
              <Field label="Cost savings or efficiency improvements">
                <TextInput
                  value={form.costSavings}
                  onChange={(v) => update("costSavings", v)}
                  placeholder="e.g., 30% reduction in travel costs"
                />
              </Field>
            </div>

            <Field label="Other metrics (optional)">
              <TextInput
                value={form.otherMetrics}
                onChange={(v) => update("otherMetrics", v)}
                placeholder="Any other measurable results..."
                rows={2}
              />
            </Field>
          </SectionCard>
        );

      // ── SECTION 7: Tagging & Partners ──
      case 6:
        return (
          <SectionCard
            icon={<Users className="h-5 w-5" />}
            title="Tagging & Partners"
            subtitle="Collaborators & acknowledgments"
            color="from-indigo-500 to-blue-600"
          >
            <Field label="Funding/Implementing Partners to acknowledge">
              <TextInput
                value={form.fundingPartners}
                onChange={(v) => update("fundingPartners", v)}
                placeholder="e.g., USAID, WHO, Ministry of Health..."
                rows={2}
              />
            </Field>

            <Field label="Government collaborators">
              <TextInput
                value={form.governmentCollaborators}
                onChange={(v) => update("governmentCollaborators", v)}
                placeholder="e.g., County Health Department..."
                rows={2}
              />
            </Field>

            <Field label="Other stakeholders involved">
              <TextInput
                value={form.otherStakeholders}
                onChange={(v) => update("otherStakeholders", v)}
                placeholder="e.g., Community leaders, local NGOs..."
                rows={2}
              />
            </Field>
          </SectionCard>
        );

      // ── SECTION 8: Consent & Approval ──
      case 7:
        return (
          <SectionCard
            icon={<FileCheck className="h-5 w-5" />}
            title="Consent & Approval"
            subtitle="Sign-off & submission"
            color="from-emerald-500 to-green-600"
          >
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
              <Checkbox
                checked={form.consentConfirmed}
                onChange={(v) => update("consentConfirmed", v)}
                label="I confirm that consent has been obtained for all photos, videos, and quotes shared. This information is accurate and approved for public communication."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Reporting Officer's Name" required>
                <TextInput
                  value={form.reportingOfficer}
                  onChange={(v) => update("reportingOfficer", v)}
                  placeholder="Full name"
                />
              </Field>
              <Field label="Title" required>
                <TextInput
                  value={form.officerTitle}
                  onChange={(v) => update("officerTitle", v)}
                  placeholder="e.g., Project Manager"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mobile No." required>
                <TextInput
                  value={form.mobileNo}
                  onChange={(v) => update("mobileNo", v)}
                  placeholder="e.g., +254 7XX XXX XXX"
                />
              </Field>
              <Field label="Date" required>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => update("date", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-700 transition-colors focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </Field>
            </div>

            {/* Signature preview */}
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
              <p className="text-sm font-medium text-gray-500">
                Digital Signature
              </p>
              <p className="mt-2 font-serif text-2xl text-teal-600">
                {form.reportingOfficer || "_________________________"}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {form.reportingOfficer
                  ? "✓ Signed electronically"
                  : "Enter your name above to sign"}
              </p>
            </div>

            {/* Submit warning */}
            {!form.consentConfirmed && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                ⚠️ Please confirm consent before submitting
              </div>
            )}
          </SectionCard>
        );

      default:
        return null;
    }
  };

  // ── Submission Success Screen ──

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
        <div className="w-full max-w-lg animate-in fade-in zoom-in-95 rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-lg duration-300">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Story Submitted! 🎉
          </h2>
          <p className="mt-2 text-gray-500">
            Thank you for capturing and sharing your story. Your submission has
            been saved successfully.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Remember to email the completed form along with photos/videos to:
          </p>
          <p className="mt-1 text-sm font-medium text-teal-600">
            communications@chak.or.ke
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleDownload}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Download Summary
            </button>
            <button
              onClick={() => {
                setForm(defaultFormData);
                setCompletedSections(new Set());
                setSubmitted(false);
                setStep(0);
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              <Send className="h-4 w-4" />
              New Story
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Wizard ──

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50/30">
      {/* Top Nav Bar */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm">
              <span className="text-sm font-bold">CH</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">
                CHAK Story Capture
              </h1>
              <p className="text-xs text-gray-400">{userEmail}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Save Draft */}
            <button
              onClick={handleSaveDraft}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <Save className="h-3.5 w-3.5" />
              Save Draft
            </button>

            {/* Step indicator */}
            <span className="hidden text-xs text-gray-400 sm:block">
              Step {step + 1} of {sections.length}
            </span>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
            style={{
              width: `${((step + 1) / sections.length) * 100}%`,
            }}
          />
        </div>
      </header>

      {/* Save Toast */}
      {showSaveToast && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-top-2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg duration-200">
          <Check className="mr-1.5 inline h-3.5 w-3.5" />
          Draft saved
        </div>
      )}

      {/* Main Content */}
      <div ref={topRef} className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex gap-8">
          {/* Sidebar */}
          <Sidebar
            currentStep={step}
            completedSections={completedSections}
            onNavigate={goTo}
          />

          {/* Form Area */}
          <div className="min-w-0 flex-1">
            {/* Mobile progress chips */}
            <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
              {sections.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => goTo(idx)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    step === idx
                      ? "bg-teal-100 text-teal-700"
                      : completedSections.has(idx)
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {completedSections.has(idx) && <Check className="h-3 w-3" />}
                  {s.title}
                </button>
              ))}
            </div>

            {/* Step Content */}
            {renderStep()}

            {/* Navigation Buttons */}
            <div className="mt-6 flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <button
                onClick={() => goTo(step - 1)}
                disabled={step === 0}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              {/* Step dots */}
              <div className="hidden items-center gap-1.5 sm:flex">
                {sections.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goTo(idx)}
                    className={`h-2 w-2 rounded-full transition-all ${
                      step === idx
                        ? "w-6 bg-teal-500"
                        : completedSections.has(idx)
                          ? "bg-emerald-400"
                          : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>

              {step < sections.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!form.consentConfirmed}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-emerald-600 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Submit Story
                </button>
              )}
            </div>

            {/* Email reminder */}
            <div className="mt-4 rounded-lg border border-gray-100 bg-white p-3 text-center text-xs text-gray-400">
              Once complete, email this form along with photos/videos to{" "}
              <span className="font-medium text-teal-600">
                communications@chak.or.ke
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
