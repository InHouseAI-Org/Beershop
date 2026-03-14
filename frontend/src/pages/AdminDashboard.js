import React, { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
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
import SchemesTab from '../components/admin/SchemesTab';
import RecurringExpensesTab from '../components/admin/RecurringExpensesTab';
import BalanceSheetTab from '../components/admin/BalanceSheetTab';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', path: '' },
    { id: 'salesReport', label: 'Sales Report', path: 'sales-report' },
    { id: 'balanceSheet', label: 'Balance Sheet', path: 'balance-sheet' },
    { id: 'balances', label: 'Balances', path: 'balances' },
    { id: 'balanceTransfers', label: 'Balance Transfers', path: 'balance-transfers' },
    { id: 'expenses', label: 'Expenses', path: 'expenses' },
    { id: 'recurringExpenses', label: 'Recurring Expenses', path: 'recurring-expenses' },
    { id: 'products', label: 'Products', path: 'products' },
    { id: 'creditHolders', label: 'Credit Holders', path: 'credit-holders' },
    { id: 'orders', label: 'Orders', path: 'orders' },
    { id: 'distributors', label: 'Distributors', path: 'distributors' },
    { id: 'schemes', label: 'Schemes', path: 'schemes' },
    { id: 'inventory', label: 'Inventory', path: 'inventory' },
    { id: 'users', label: 'Users', path: 'users' }
  ];

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
            <NavLink
              key={tab.id}
              to={`/admin/${tab.path}`}
              end={tab.path === ''}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => ({
                width: '100%',
                padding: '1rem 1.5rem',
                background: isActive ? '#000' : 'transparent',
                border: 'none',
                borderLeft: isActive ? '4px solid #000' : '4px solid transparent',
                color: isActive ? '#fff' : '#666',
                fontWeight: isActive ? '700' : '500',
                cursor: 'pointer',
                fontSize: '0.95rem',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                display: 'block',
                marginBottom: '0.25rem',
                textDecoration: 'none'
              })}
              onMouseEnter={(e) => {
                const isActive = e.currentTarget.classList.contains('active');
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                  e.currentTarget.style.borderLeftColor = '#666';
                }
              }}
              onMouseLeave={(e) => {
                const isActive = e.currentTarget.classList.contains('active');
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderLeftColor = 'transparent';
                }
              }}
            >
              {tab.label}
            </NavLink>
          ))}
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: '2rem', backgroundColor: '#f8f9fa', overflowY: 'auto' }}>
          <Routes>
            <Route index element={<DashboardTab />} />
            <Route path="sales-report" element={<SalesReportTab />} />
            <Route path="balance-sheet" element={<BalanceSheetTab />} />
            <Route path="balances" element={<BalanceTab />} />
            <Route path="balance-transfers" element={<BalanceTransfersTab />} />
            <Route path="expenses" element={<ExpenseTab />} />
            <Route path="recurring-expenses" element={<RecurringExpensesTab />} />
            <Route path="inventory" element={<InventoryTab />} />
            <Route path="products" element={<ProductsTab />} />
            <Route path="credit-holders" element={<CreditHoldersTab />} />
            <Route path="distributors" element={<DistributorsTab />} />
            <Route path="schemes" element={<SchemesTab />} />
            <Route path="orders" element={<OrdersTab />} />
            <Route path="users" element={<UsersTab />} />
            {/* Redirect unknown paths to dashboard */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
