import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { useRole } from './context/RoleContext';
import { UserRole } from './types';

// Auth Page
import { LoginPage } from './pages/LoginPage';

// Student Pages
import { StudentOverview } from './pages/student/StudentOverview';
import { StudentCourses } from './pages/student/StudentCourses';
import { StudentResources } from './pages/student/StudentResources';
import { ImportantQuestions } from './pages/student/ImportantQuestions';
import { PracticePapers } from './pages/student/PracticePapers';
import { StudentAnalytics } from './pages/student/StudentAnalytics';

// Teacher Pages
import { TeacherOverview } from './pages/teacher/TeacherOverview';
import { CourseModuleManagement } from './pages/teacher/CourseModuleManagement';
import { ExamBuilder } from './pages/teacher/ExamBuilder';
import { ExamManagement } from './pages/teacher/ExamManagement';
import { EvaluationWorkbench } from './pages/teacher/EvaluationWorkbench';
import { MarksheetVerification } from './pages/teacher/MarksheetVerification';
import { ResultsReporting } from './pages/teacher/ResultsReporting';
import { RubricsAnswerKeys } from './pages/teacher/RubricsAnswerKeys';

// Common
import { SettingsPage } from './pages/SettingsPage';

const RequireAuth: React.FC = () => {
  const { isAuthenticated } = useRole();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <AppLayout />;
};

const RedirectIfAuthenticated: React.FC = () => {
  const { isAuthenticated, role } = useRole();
  if (isAuthenticated) {
    return <Navigate to={role === 'teacher' ? '/teacher/overview' : '/student/overview'} replace />;
  }
  return <LoginPage />;
};

const RequireRole: React.FC<{ allowedRole: UserRole }> = ({ allowedRole }) => {
  const { isAuthenticated, role } = useRole();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (role !== allowedRole) {
    return <Navigate to={role === 'teacher' ? '/teacher/overview' : '/student/overview'} replace />;
  }
  return <Outlet />;
};

const RootRedirect: React.FC = () => {
  const { isAuthenticated, role } = useRole();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={role === 'teacher' ? '/teacher/overview' : '/student/overview'} replace />;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <RedirectIfAuthenticated />,
  },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        index: true,
        element: <RootRedirect />,
      },
      // Student Routes (strictly isolated)
      {
        path: 'student',
        element: <RequireRole allowedRole="student" />,
        children: [
          { index: true, element: <Navigate to="/student/overview" replace /> },
          { path: 'overview', element: <StudentOverview /> },
          { path: 'courses', element: <StudentCourses /> },
          { path: 'resources', element: <StudentResources /> },
          { path: 'questions', element: <ImportantQuestions /> },
          { path: 'practice', element: <PracticePapers /> },
          { path: 'analytics', element: <StudentAnalytics /> },
        ],
      },
      // Teacher Routes (strictly isolated)
      {
        path: 'teacher',
        element: <RequireRole allowedRole="teacher" />,
        children: [
          { index: true, element: <Navigate to="/teacher/overview" replace /> },
          { path: 'overview', element: <TeacherOverview /> },
          { path: 'courses', element: <CourseModuleManagement /> },
          { path: 'resources', element: <StudentResources /> },
          { path: 'exam-builder', element: <ExamBuilder /> },
          { path: 'exams', element: <ExamManagement /> },
          { path: 'evaluation', element: <EvaluationWorkbench /> },
          { path: 'marksheets', element: <MarksheetVerification /> },
          { path: 'results', element: <ResultsReporting /> },
          { path: 'rubrics', element: <RubricsAnswerKeys /> },
        ],
      },
      // Settings
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      // Fallback
      {
        path: '*',
        element: <RootRedirect />,
      },
    ],
  },
]);
