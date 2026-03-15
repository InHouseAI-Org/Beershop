import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import MonthlySalesChart from './charts/MonthlySalesChart';
import DistributorOrdersChart from './charts/DistributorOrdersChart';
import CreditOutstandingChart from './charts/CreditOutstandingChart';
import ProductSalesChart from './charts/ProductSalesChart';

const DashboardTab = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalCreditHolders: 0,
    totalDistributors: 0,
    totalOrders: 0,
    recentSales: []
  });
  const [analyticsData, setAnalyticsData] = useState({
    monthlySales: [],
    distributorOrders: [],
    creditOutstanding: [],
    productSales: [],
    distributorNames: [],
    productNames: [],
    creditHolderNames: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [usersRes, productsRes, creditHoldersRes, distributorsRes, ordersRes, salesRes, analyticsRes] = await Promise.all([
        api.get('/users'),
        api.get('/products'),
        api.get('/credit-holders'),
        api.get('/distributors'),
        api.get('/orders'),
        api.get('/sales'),
        api.get('/analytics/monthly')
      ]);

      setStats({
        totalUsers: usersRes.data.length,
        totalProducts: productsRes.data.length,
        totalCreditHolders: creditHoldersRes.data.length,
        totalDistributors: distributorsRes.data.length,
        totalOrders: ordersRes.data.length,
        recentSales: salesRes.data.slice(0, 10).reverse()
      });

      setAnalyticsData(analyticsRes.data);

      setError('');
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <h2 style={{
        color: '#000',
        margin: 0,
        fontSize: isMobile ? '1.5rem' : '2rem',
        fontWeight: '700',
        letterSpacing: '0.5px',
        marginBottom: isMobile ? '1rem' : '2rem'
      }}>
        Dashboard Overview
      </h2>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: isMobile ? '1rem' : '1.5rem',
        marginBottom: isMobile ? '1rem' : '2rem'
      }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#666', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
            Total Users
          </h3>
          <p style={{ fontSize: isMobile ? '2.5rem' : '3rem', fontWeight: '700', color: '#000', margin: 0 }}>
            {stats.totalUsers}
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#666', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
            Total Products
          </h3>
          <p style={{ fontSize: isMobile ? '2.5rem' : '3rem', fontWeight: '700', color: '#000', margin: 0 }}>
            {stats.totalProducts}
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#666', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
            Credit Holders
          </h3>
          <p style={{ fontSize: isMobile ? '2.5rem' : '3rem', fontWeight: '700', color: '#000', margin: 0 }}>
            {stats.totalCreditHolders}
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#666', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
            Distributors
          </h3>
          <p style={{ fontSize: isMobile ? '2.5rem' : '3rem', fontWeight: '700', color: '#000', margin: 0 }}>
            {stats.totalDistributors}
          </p>
        </div>
      </div>

      {/* Analytics Charts */}
      {analyticsData.monthlySales && analyticsData.monthlySales.length > 0 && (
        <>
          <MonthlySalesChart data={analyticsData.monthlySales} />

          {analyticsData.distributorNames && analyticsData.distributorNames.length > 0 && (
            <DistributorOrdersChart
              data={analyticsData.distributorOrders}
              distributorNames={analyticsData.distributorNames}
            />
          )}

          <CreditOutstandingChart
            data={analyticsData.creditOutstanding}
            creditHolderNames={analyticsData.creditHolderNames}
          />

          {analyticsData.productNames && analyticsData.productNames.length > 0 && (
            <ProductSalesChart
              data={analyticsData.productSales}
              productNames={analyticsData.productNames}
            />
          )}
        </>
      )}

    </>
  );
};

export default DashboardTab;
