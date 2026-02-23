import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

const DashboardTab = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalCreditHolders: 0,
    totalDistributors: 0,
    totalOrders: 0,
    recentSales: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [usersRes, productsRes, creditHoldersRes, distributorsRes, ordersRes, salesRes] = await Promise.all([
        api.get('/users'),
        api.get('/products'),
        api.get('/credit-holders'),
        api.get('/distributors'),
        api.get('/orders'),
        api.get('/sales')
      ]);

      setStats({
        totalUsers: usersRes.data.length,
        totalProducts: productsRes.data.length,
        totalCreditHolders: creditHoldersRes.data.length,
        totalDistributors: distributorsRes.data.length,
        totalOrders: ordersRes.data.length,
        recentSales: salesRes.data.slice(0, 10).reverse()
      });

      setError('');
    } catch (err) {
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <h2 style={{ color: '#000', margin: 0, fontSize: '2rem', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '2rem' }}>
        Dashboard Overview
      </h2>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#666', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
            Total Users
          </h3>
          <p style={{ fontSize: '3rem', fontWeight: '700', color: '#000', margin: 0 }}>
            {stats.totalUsers}
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#666', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
            Total Products
          </h3>
          <p style={{ fontSize: '3rem', fontWeight: '700', color: '#000', margin: 0 }}>
            {stats.totalProducts}
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#666', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
            Credit Holders
          </h3>
          <p style={{ fontSize: '3rem', fontWeight: '700', color: '#000', margin: 0 }}>
            {stats.totalCreditHolders}
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#666', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
            Distributors
          </h3>
          <p style={{ fontSize: '3rem', fontWeight: '700', color: '#000', margin: 0 }}>
            {stats.totalDistributors}
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#666', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
            Total Orders
          </h3>
          <p style={{ fontSize: '3rem', fontWeight: '700', color: '#000', margin: 0 }}>
            {stats.totalOrders}
          </p>
        </div>
      </div>

    </>
  );
};

export default DashboardTab;
