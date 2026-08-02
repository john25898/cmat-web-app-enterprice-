"use client";

import { useEffect, useState } from "react";
import LoginPage from "@/components/LoginPage";
import CHAKStoryCaptureTool from "@/components/CHAKStoryCaptureTool";
import EmployeeDashboard from "@/components/EmployeeDashboard";
import SupervisorDashboard from "@/components/SupervisorDashboard";
import StorySupervisorDashboard from "@/components/StorySupervisorDashboard";
import StaffTimesheetDashboard from "@/components/StaffTimesheetDashboard";
import FacilityInchargeDashboard from "@/components/FacilityInchargeDashboard";
import CountyRepDashboard from "@/components/CountyRepDashboard";
import ProgramHRDashboard from "@/components/ProgramHRDashboard";
import { type AuthUser } from "@/lib/auth";

const SESSION_KEY = "chak-session";

function loadSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.email || !parsed.role) return null;
    return parsed as AuthUser;
  } catch {
    return null;
  }
}

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Restore session on mount
  useEffect(() => {
    setUser(loadSession());
    setIsRestoring(false);
  }, []);

  const handleLogin = (loggedInUser: AuthUser) => {
    setUser(loggedInUser);
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(loggedInUser));
    } catch {
      // ignore storage errors
    }
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore storage errors
    }
  };

  if (isRestoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="text-sm text-gray-500">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const userEmail = user.email;

  switch (user.role) {
    case "cmat_officer":
      return (
        <EmployeeDashboard userEmail={userEmail} onLogout={handleLogout} />
      );
    case "cmat_supervisor":
      return (
        <SupervisorDashboard userEmail={userEmail} onLogout={handleLogout} />
      );
    case "story_teller":
      return (
        <CHAKStoryCaptureTool userEmail={userEmail} onLogout={handleLogout} />
      );
    case "story_supervisor":
      return (
        <StorySupervisorDashboard
          userEmail={userEmail}
          onLogout={handleLogout}
        />
      );
    case "staff":
      return <StaffTimesheetDashboard user={user} onLogout={handleLogout} />;
    case "facility_incharge":
      return <FacilityInchargeDashboard user={user} onLogout={handleLogout} />;
    case "county_rep":
      return <CountyRepDashboard user={user} onLogout={handleLogout} />;
    case "program_hr":
      return <ProgramHRDashboard user={user} onLogout={handleLogout} />;
    default:
      return (
        <CHAKStoryCaptureTool userEmail={userEmail} onLogout={handleLogout} />
      );
  }
}
