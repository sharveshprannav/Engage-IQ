import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { FeedbackExplorerPage } from './pages/FeedbackExplorerPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { SettingsPage } from './pages/SettingsPage';
import { MLPipelinePage } from './pages/MLPipelinePage';

// Route Guard: Ensures only authenticated users with valid access_token can view workspace pages
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export const router = createBrowserRouter([
  // Public Routes
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignUpPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },

  // Protected Workspace Routes (Accessible only after Login)
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/ml-pipeline',
    element: (
      <ProtectedRoute>
        <MLPipelinePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/assistant',
    element: (
      <ProtectedRoute>
        <AIAssistantPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/analytics',
    element: (
      <ProtectedRoute>
        <AIAssistantPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/explorer',
    element: (
      <ProtectedRoute>
        <FeedbackExplorerPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
