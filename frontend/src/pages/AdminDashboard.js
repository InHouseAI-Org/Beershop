import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';
import DashboardTab from '../components/admin/DashboardTab';
import InventoryTab from '../components/admin/InventoryTab';
import ProductsTab from '../components/admin/ProductsTab';
import CreditHoldersTab from '../components/admin/CreditHoldersTab';
import DistributorsTab from '../components/admin/DistributorsTab';
import OrdersTab from '../components/admin/OrdersTab';
import UsersTab from '../components/admin/UsersTab';
import SalesReportTab from '../components/admin/SalesReportTab';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  useEffect(() => {
    // Check if user is on mobile device
    const isMobile = window.innerWidth < 768;
    const hasSeenWarning = sessionStorage.getItem('adminMobileWarningDismissed');

    if (isMobile && !hasSeenWarning) {
      setShowMobileWarning(true);
    }
  }, []);

  const dismissWarning = () => {
    sessionStorage.setItem('adminMobileWarningDismissed', 'true');
    setShowMobileWarning(false);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'salesReport', label: 'Sales Report' },
    { id: 'products', label: 'Products' },
    { id: 'creditHolders', label: 'Credit Holders' },
    { id: 'orders', label: 'Orders' },
    { id: 'distributors', label: 'Distributors' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'users', label: 'Users' }
  ];

  return (
    <>
      {/* Mobile Device Warning */}
      {showMobileWarning && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
              border: '3px solid #ff9800',
              animation: 'modalSlideIn 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                backgroundColor: '#fff3e0',
                borderRadius: '50%',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={48} style={{ color: '#ff9800' }} />
              </div>
            </div>

            <h2 style={{
              textAlign: 'center',
              marginBottom: '1rem',
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#000'
            }}>
              Mobile Device Detected
            </h2>

            <p style={{
              textAlign: 'center',
              marginBottom: '0.5rem',
              fontSize: '1rem',
              color: '#666',
              lineHeight: '1.6'
            }}>
              For the best experience with the Admin Panel, we recommend using a <strong style={{ color: '#000' }}>tablet or desktop computer</strong>.
            </p>

            <p style={{
              textAlign: 'center',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              color: '#999',
              lineHeight: '1.6'
            }}>
              The admin interface contains many features and data tables that work better on larger screens.
            </p>

            <div style={{
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #dee2e6'
            }}>
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: '#666',
                textAlign: 'center'
              }}>
                📱 For sales submission on mobile, regular users should use the dedicated sales form which is mobile-optimized.
              </p>
            </div>

            <button
              onClick={dismissWarning}
              className="btn btn-primary"
              style={{
                width: '100%',
                fontSize: '1.125rem',
                padding: '1rem',
                backgroundColor: '#ff9800',
                borderColor: '#ff9800',
                fontWeight: '700'
              }}
            >
              I Understand, Continue
            </button>

            <p style={{
              textAlign: 'center',
              marginTop: '1rem',
              fontSize: '0.75rem',
              color: '#999'
            }}>
              This message will not appear again in this session
            </p>
          </div>
        </div>
      )}

      <div className="header">
        <div className="header-content">
          <div>
            <h1>Admin Dashboard</h1>
            <p style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Welcome, {user?.username}
            </p>
          </div>
          <button onClick={logout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>

      <div className="container">
        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0.2rem',
          marginBottom: '2rem',
          borderBottom: '3px solid #000',
          overflowX: 'auto',
          flexWrap: 'wrap',
          backgroundColor: 'white',
          padding: '0.5rem',
          borderRadius: '12px 12px 0 0',
          justifyContent: 'space-between',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 1rem',
                background: activeTab === tab.id ? '#000' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: activeTab === tab.id ? 'white' : '#666',
                fontWeight: activeTab === tab.id ? '700' : '600',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.3s',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'salesReport' && <SalesReportTab />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'creditHolders' && <CreditHoldersTab />}
        {activeTab === 'distributors' && <DistributorsTab />}
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'users' && <UsersTab />}
      </div>
    </>
  );
};

export default AdminDashboard;
