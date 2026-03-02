import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X } from 'lucide-react';
import DashboardTab from '../components/admin/DashboardTab';
import InventoryTab from '../components/admin/InventoryTab';
import ProductsTab from '../components/admin/ProductsTab';
import CreditHoldersTab from '../components/admin/CreditHoldersTab';
import DistributorsTab from '../components/admin/DistributorsTab';
import OrdersTab from '../components/admin/OrdersTab';
import UsersTab from '../components/admin/UsersTab';
import SalesReportTab from '../components/admin/SalesReportTab';
import BalanceTab from '../components/admin/BalanceTab';
import ExpenseTab from '../components/admin/ExpenseTab';
import BalanceTransfersTab from '../components/admin/BalanceTransfersTab';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'salesReport', label: 'Sales Report' },
    { id: 'balances', label: 'Balances' },
    { id: 'balanceTransfers', label: 'Balance Transfers' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'products', label: 'Products' },
    { id: 'creditHolders', label: 'Credit Holders' },
    { id: 'orders', label: 'Orders' },
    { id: 'distributors', label: 'Distributors' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'users', label: 'Users' }
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSidebarOpen(false); // Close sidebar on mobile after selecting a tab
  };

  return (
    <>

      <div className="header">
        <div className="header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Hamburger Menu Button - Only visible on mobile */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                cursor: 'pointer',
                padding: '0.5rem',
                color: '#ffffff',
                backgroundColor: 'transparent',
                border: 'none',
                display: 'none' // Hidden by default, shown on mobile via CSS
              }}
              className="mobile-menu-btn"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1>Admin Dashboard</h1>
                {user?.organisationName && (
                    <h1 style={{ marginLeft: '0.5rem', color: '#ffffff', fontWeight: '800' }}>
                      | {user.organisationName}
                    </h1>
                  )}
                  </div>
              <p style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Welcome, {user?.username}
              </p>
            </div>
          </div>
          <button onClick={logout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 120px)', position: 'relative' }}>
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 998,
              display: 'none'
            }}
            className="sidebar-overlay"
          />
        )}

        {/* Left Sidebar Navigation */}
        <div
          className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}
          style={{
            width: '20%',
            minWidth: '150px',
            backgroundColor: '#fff',
            borderRight: '2px solid #e0e0e0',
            padding: '1rem 0',
            position: 'relative',
            height: '100%',
            overflowY: 'auto',
            transition: 'transform 0.3s ease'
          }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                width: '100%',
                padding: '1rem 1.5rem',
                background: activeTab === tab.id ? '#000' : 'transparent',
                border: 'none',
                borderLeft: activeTab === tab.id ? '4px solid #000' : '4px solid transparent',
                color: activeTab === tab.id ? '#fff' : '#666',
                fontWeight: activeTab === tab.id ? '700' : '500',
                cursor: 'pointer',
                fontSize: '0.95rem',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                display: 'block',
                marginBottom: '0.25rem'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.backgroundColor = '#f5f5f5';
                  e.target.style.borderLeftColor = '#666';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.borderLeftColor = 'transparent';
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: '2rem', backgroundColor: '#f8f9fa', overflowY: 'auto' }}>
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'salesReport' && <SalesReportTab />}
          {activeTab === 'balances' && <BalanceTab />}
          {activeTab === 'balanceTransfers' && <BalanceTransfersTab />}
          {activeTab === 'expenses' && <ExpenseTab />}
          {activeTab === 'inventory' && <InventoryTab />}
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'creditHolders' && <CreditHoldersTab />}
          {activeTab === 'distributors' && <DistributorsTab />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'users' && <UsersTab />}
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
