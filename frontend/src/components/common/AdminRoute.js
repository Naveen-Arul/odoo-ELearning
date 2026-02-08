/**
 * SkillForge AI - Admin Route Component
 * Wrapper for routes that require admin privileges
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function AdminRoute({ children }) {
  const { isAuthenticated, isInitialized, isAdmin } = useAuthStore();

  // Wait for auth initialization
  if (!isInitialized) {
    return null;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to dashboard if not admin
  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
