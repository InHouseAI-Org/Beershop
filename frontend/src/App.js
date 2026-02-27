import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import AddSales from './pages/AddSales';
import RoleRedirect from './components/RoleRedirect';
import { Analytics } from "@vercel/analytics/react";

function App() {
  return (
    <Router>
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

          {/* Admin route - only accessible by admin */}
          <Route
            path="/admin"
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
