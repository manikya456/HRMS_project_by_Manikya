import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import DashboardPage from "@/pages/Dashboard";
import EmployeesPage from "@/pages/Employees";
import AttendancePage from "@/pages/Attendance";
import LeavePage from "@/pages/Leave";
import PayrollPage from "@/pages/Payroll";
import PerformancePage from "@/pages/Performance";
import RecruitmentPage from "@/pages/Recruitment";
import ResumeScreeningPage from "@/pages/ResumeScreening";
import BulkResumeScreeningPage from "@/pages/BulkResumeScreening";
import VoiceInterviewPage from "@/pages/VoiceInterview";
import AnalyticsPage from "@/pages/Analytics";
import SettingsPage from "@/pages/Settings";
import ProfilePage from "@/pages/Profile";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell>
              <DashboardPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute roles={["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER"]}>
            <AppShell>
              <EmployeesPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <AppShell>
              <AttendancePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave"
        element={
          <ProtectedRoute>
            <AppShell>
              <LeavePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll"
        element={
          <ProtectedRoute roles={["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER"]}>
            <AppShell>
              <PayrollPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/performance"
        element={
          <ProtectedRoute roles={["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER"]}>
            <AppShell>
              <PerformancePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruitment"
        element={
          <ProtectedRoute roles={["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER"]}>
            <AppShell>
              <RecruitmentPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/resume-screening"
        element={
          <ProtectedRoute roles={["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER"]}>
            <AppShell>
              <ResumeScreeningPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bulk-resume-screening"
        element={
          <ProtectedRoute roles={["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER"]}>
            <AppShell>
              <BulkResumeScreeningPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/voice-interview"
        element={
          <ProtectedRoute roles={["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER"]}>
            <AppShell>
              <VoiceInterviewPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AppShell>
              <AnalyticsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppShell>
              <ProfilePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppShell>
              <SettingsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
