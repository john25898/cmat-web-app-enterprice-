"use client";

import { useState } from "react";
import LoginPage, { type UserRole } from "@/components/LoginPage";
import CHAKStoryCaptureTool from "@/components/CHAKStoryCaptureTool";
import EmployeeDashboard from "@/components/EmployeeDashboard";
import SupervisorDashboard from "@/components/SupervisorDashboard";
import StorySupervisorDashboard from "@/components/StorySupervisorDashboard";
import StaffTimesheetDashboard from "@/components/StaffTimesheetDashboard";
import FacilityInchargeDashboard from "@/components/FacilityInchargeDashboard";
import CountyRepDashboard from "@/components/CountyRepDashboard";
import ProgramHRDashboard from "@/components/ProgramHRDashboard";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("story_teller");

  const handleLogin = (email: string, role: UserRole) => {
    setUserEmail(email);
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserEmail("");
    setUserRole("story_teller");
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  switch (userRole) {
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
      return (
        <StaffTimesheetDashboard
          userEmail={userEmail}
          onLogout={handleLogout}
        />
      );
    case "facility_incharge":
      return (
        <FacilityInchargeDashboard
          userEmail={userEmail}
          onLogout={handleLogout}
        />
      );
    case "county_rep":
      return (
        <CountyRepDashboard userEmail={userEmail} onLogout={handleLogout} />
      );
    case "program_hr":
      return (
        <ProgramHRDashboard userEmail={userEmail} onLogout={handleLogout} />
      );
    default:
      return (
        <CHAKStoryCaptureTool userEmail={userEmail} onLogout={handleLogout} />
      );
  }
}
