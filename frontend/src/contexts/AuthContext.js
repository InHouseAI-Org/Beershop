import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrganisationName = async (organisationId) => {
    try {
      const response = await api.get(`/organisations/${organisationId}`);
      return response.data.organisation_name;
    } catch (error) {
      console.error('Failed to fetch organisation name:', error);
      return null;
    }
  };

  const verifyToken = async () => {
    try {
      const response = await api.get('/auth/verify');
      const userData = response.data.user;

      // Fetch organisation name if user has organisationId
      if (userData.organisationId && !userData.organisationName) {
        const orgName = await fetchOrganisationName(userData.organisationId);
        userData.organisationName = orgName;
      }

      setUser(userData);
    } catch (error) {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });

      localStorage.setItem('token', response.data.token);
      const userData = response.data.user;

      // Fetch organisation name if user has organisationId
      if (userData.organisationId && !userData.organisationName) {
        const orgName = await fetchOrganisationName(userData.organisationId);
        userData.organisationName = orgName;
      }

      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error('AuthContext: Login error', error);

      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Login failed. Please check your network connection.'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isSuperAdmin: user?.role === 'superadmin',
    isAdmin: user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
