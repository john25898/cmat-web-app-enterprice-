"use client";

import { useState } from "react";
import {
  Mail,
  ArrowRight,
  UserCheck,
  ShieldCheck,
  Camera,
  Eye,
  Clock,
  ClipboardCheck,
  Shield,
  KeyRound,
} from "lucide-react";
import {
  authenticate,
  type AuthUser,
  type UserRole,
  SECURED_ROLES,
} from "@/lib/auth";

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
}

const roles: {
  value: UserRole;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "cmat_officer",
    label: "CMAT Officer",
    description: "Submit workplans & field reports",
    icon: <UserCheck className="h-5 w-5" />,
    color: "from-sky-500 to-blue-600",
  },
  {
    value: "cmat_supervisor",
    label: "CMAT Supervisor",
    description: "Review & approve CMAT submissions",
    icon: <ShieldCheck className="h-5 w-5" />,
    color: "from-violet-500 to-purple-600",
  },
  {
    value: "story_teller",
    label: "Story Teller",
    description: "Capture & share CHAK impact stories",
    icon: <Camera className="h-5 w-5" />,
    color: "from-teal-500 to-emerald-600",
  },
  {
    value: "story_supervisor",
    label: "Story Supervisor",
    description: "Review & approve story submissions",
    icon: <Eye className="h-5 w-5" />,
    color: "from-amber-500 to-orange-600",
  },
  {
    value: "staff",
    label: "Staff",
    description: "Log timesheets & track work hours",
    icon: <Clock className="h-5 w-5" />,
    color: "from-indigo-500 to-indigo-700",
  },
  {
    value: "facility_incharge",
    label: "Facility In-Charge",
    description: "Approve staff timesheets",
    icon: <ClipboardCheck className="h-5 w-5" />,
    color: "from-violet-500 to-purple-700",
  },
  {
    value: "county_rep",
    label: "County Rep",
    description: "County-level timesheet approval",
    icon: <ShieldCheck className="h-5 w-5" />,
    color: "from-teal-500 to-cyan-700",
  },
  {
    value: "program_hr",
    label: "Program HR",
    description: "Final approval of timesheets",
    icon: <Shield className="h-5 w-5" />,
    color: "from-emerald-500 to-emerald-700",
  },
];

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedRole) {
      setError("Please select a role");
      return;
    }

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    // Secured roles (staff, in-charge, county rep, HR) require real credentials
    if (SECURED_ROLES.includes(selectedRole)) {
      const user = authenticate(email, password);
      if (!user) {
        setError(
          "Invalid username or password. Check your credentials or contact Program HR.",
        );
        return;
      }
      onLogin(user);
      return;
    }

    // Legacy demo roles: accept any email/password
    const user: AuthUser = {
      email: email.trim().toLowerCase(),
      name: email
        .split("@")[0]
        .replace(/[._]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      role: selectedRole,
      facility: "",
      county: "",
      jobTitle: "",
      phone: "",
    };
    onLogin(user);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo Area */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-200">
            <span className="text-xl font-bold text-white">CH</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            CHAK Field Portal
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            CMAT Operations &amp; Story Content &amp; Staff Timesheets
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-lg shadow-gray-200/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                      selectedRole === role.value
                        ? "border-teal-500 bg-teal-50 shadow-sm shadow-teal-100"
                        : "border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${
                        role.color
                      } ${
                        selectedRole === role.value ? "scale-110" : ""
                      } transition-transform`}
                    >
                      {role.icon}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          selectedRole === role.value
                            ? "text-teal-800"
                            : "text-gray-700"
                        }`}
                      >
                        {role.label}
                      </p>
                      <p
                        className={`text-[11px] leading-tight ${
                          selectedRole === role.value
                            ? "text-teal-600"
                            : "text-gray-400"
                        }`}
                      >
                        {role.description}
                      </p>
                    </div>
                    {selectedRole === role.value && (
                      <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-white shadow">
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-200 transition-all hover:from-teal-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              Sign In
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>

          {/* Credential hint for secured roles */}
          {selectedRole && SECURED_ROLES.includes(selectedRole) && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-xs leading-relaxed text-amber-800">
                Use the username and password from your employee record (e.g.
                <span className="font-semibold"> your.name@chak.org</span>).
                Your role, facility and county are detected automatically from
                your account.
              </p>
            </div>
          )}
        </div>

        {/* Info footer */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>
            Part of the{" "}
            <span className="font-medium text-teal-600">
              Christian Health Association of Kenya
            </span>{" "}
            communications platform
          </p>
        </div>
      </div>
    </div>
  );
}
