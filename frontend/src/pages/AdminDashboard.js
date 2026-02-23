import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
