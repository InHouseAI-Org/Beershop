import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RoleRedirect = () => {
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
    return <Navigate to="/login" />;
  }

  // Redirect based on role
  if (user.role === 'superadmin') {
    return <Navigate to="/superadmin" />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin" />;
  }

  return <Navigate to="/dashboard" />;
};

export default RoleRedirect;
