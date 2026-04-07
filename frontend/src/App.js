import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import AddSales from './pages/AddSales';
import RoleRedirect from './components/RoleRedirect';
import { Analytics } from "@vercel/analytics/react";

// Database wake-up utility
const wakeUpDatabase = async () => {
  try {
    // Dynamically determine API URL based on current host
    const getApiUrl = () => {
      if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
      }
      const hostname = window.location.hostname;
      return `http://${hostname}:5001/api`;
    };

    const apiUrl = getApiUrl();
    await fetch(`${apiUrl}/wake-up`, {
      method: 'GET',
      keepalive: true
    });
    console.log('✅ Database wake-up initiated');
  } catch (error) {
    console.log('⚠️ Database wake-up failed (non-critical):', error.message);
  }
};

// Component to wake up DB on route changes
function DatabaseWakeUp() {
  const location = useLocation();

  useEffect(() => {
    wakeUpDatabase();
  }, [location.pathname]);

  return null;
}

function App() {
  // Wake up database on initial app load
  useEffect(() => {
    wakeUpDatabase();
  }, []);

  return (
    <Router>
      <DatabaseWakeUp />
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Superadmin route - only accessible by superadmin */}
          <Route
            path="/superadmin"
            element={
              <ProtectedRoute requireSuperAdmin={true}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin routes - only accessible by admin */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* User routes - only accessible by regular users */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireUser={true}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-sales"
            element={
              <ProtectedRoute requireUser={true}>
                <AddSales />
              </ProtectedRoute>
            }
          />

          {/* Root redirect based on role */}
          <Route path="/" element={<RoleRedirect />} />
        </Routes>
      </AuthProvider>
      <Analytics />
    </Router>
  );
}

export default App;
