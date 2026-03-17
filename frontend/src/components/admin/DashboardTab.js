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
  const [lowInventory, setLowInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [usersRes, productsRes, creditHoldersRes, distributorsRes, ordersRes, salesRes, analyticsRes, lowInventoryRes] = await Promise.all([
        api.get('/users'),
        api.get('/products'),
        api.get('/credit-holders'),
        api.get('/distributors'),
        api.get('/orders'),
        api.get('/sales'),
        api.get('/analytics/monthly'),
        api.get('/inventory/alerts')
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
      setLowInventory(lowInventoryRes.data);

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

      {/* Low Inventory Alerts */}
      {lowInventory.length > 0 && (
        <div className="card" style={{
          backgroundColor: '#FFF3E0',
          borderLeft: '4px solid #FF9800',
          marginBottom: isMobile ? '1rem' : '2rem',
          padding: isMobile ? '1rem' : '1.5rem'
        }}>
          <h3 style={{
            color: '#E65100',
            fontSize: isMobile ? '1.25rem' : '1.5rem',
            fontWeight: '700',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            Low Inventory Alert
          </h3>
          <p style={{ color: '#666', marginBottom: '1rem', fontSize: isMobile ? '0.875rem' : '1rem' }}>
            The following products are running low on stock:
          </p>
          <div style={{
            display: 'grid',
            gap: isMobile ? '0.75rem' : '1rem',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))'
          }}>
            {lowInventory.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#fff',
                  padding: isMobile ? '0.75rem' : '1rem',
                  borderRadius: '8px',
                  border: '1px solid #FFB74D',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{
                    fontWeight: '700',
                    color: '#000',
                    fontSize: isMobile ? '1rem' : '1.125rem',
                    marginBottom: '0.25rem'
                  }}>
                    {item.product_name}
                  </div>
                  <div style={{ color: '#666', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                    Current: <span style={{ fontWeight: '600', color: '#E65100' }}>{parseFloat(item.qty).toFixed(2)}</span>
                    {' | '}
                    Alert: <span style={{ fontWeight: '600', color: '#FF9800' }}>{parseFloat(item.alert_qty).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
