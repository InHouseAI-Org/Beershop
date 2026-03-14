import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requireSuperAdmin = false, requireAdmin = false, requireUser = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Superadmin-only routes (only superadmin, not admin or user)
  if (requireSuperAdmin && user.role !== 'superadmin') {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  // Admin-only routes (only admin, not superadmin or user)
  if (requireAdmin && user.role !== 'admin') {
    if (user.role === 'superadmin') return <Navigate to="/superadmin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  // User-only routes (regular users, not admin or superadmin)
  if (requireUser && (user.role === 'admin' || user.role === 'superadmin')) {
    if (user.role === 'superadmin') return <Navigate to="/superadmin" replace />;
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default ProtectedRoute;
