import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Calendar, CreditCard, TrendingUp, User, X, FileText, Package, MessageSquare } from 'lucide-react';

const SalesReportTab = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMonth, setActiveMonth] = useState('');
  const [salesByMonth, setSalesByMonth] = useState({});
  const [selectedSale, setSelectedSale] = useState(null);
  const [products, setProducts] = useState([]);
  const [creditHolders, setCreditHolders] = useState([]);

  useEffect(() => {
    fetchSalesData();
  }, []);

  const fetchSalesData = async () => {
    try {
      const [salesResponse, productsResponse, creditHoldersResponse] = await Promise.all([
        api.get('/sales'),
        api.get('/products'),
        api.get('/credit-holders')
      ]);

      const salesData = salesResponse.data;
      setProducts(productsResponse.data);
      setCreditHolders(creditHoldersResponse.data);

      // Group sales by month
      const grouped = {};
      salesData.forEach(sale => {
        const date = new Date(sale.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        if (!grouped[monthKey]) {
          grouped[monthKey] = {
            label: monthLabel,
            sales: []
          };
        }
        grouped[monthKey].sales.push(sale);
      });

      // Sort months in descending order (most recent first)
      const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
      const sortedGrouped = {};
      sortedMonths.forEach(key => {
        sortedGrouped[key] = grouped[key];
      });

      setSalesByMonth(sortedGrouped);

      // Set the first (most recent) month as active
      if (sortedMonths.length > 0) {
        setActiveMonth(sortedMonths[0]);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to fetch sales data');
      setLoading(false);
    }
  };

  const calculateCreditSum = (sale) => {
    if (!Array.isArray(sale.credit)) return 0;
    return sale.credit.reduce((sum, item) => sum + parseFloat(item.creditgiven || 0), 0);
  };

  const calculateMonthTotals = (monthSales) => {
    return monthSales.reduce((totals, sale) => {
      totals.cash += parseFloat(sale.cash_collected || 0);
      totals.upi += parseFloat(sale.upi || 0);
      totals.credit += calculateCreditSum(sale);
      return totals;
    }, { cash: 0, upi: 0, credit: 0 });
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.product_name : 'Unknown Product';
  };

  const getCreditHolderName = (creditHolderId) => {
    const holder = creditHolders.find(ch => ch.id === creditHolderId);
    return holder ? holder.name : 'Unknown';
  };

  const handleRowClick = (sale) => {
    setSelectedSale(sale);
  };

  const closeModal = () => {
    setSelectedSale(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const monthKeys = Object.keys(salesByMonth);

  return (
    <>
      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <h2 style={{ color: '#000', margin: 0, fontSize: '2rem', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '2rem' }}>
        Sales Reports
      </h2>

      {monthKeys.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#666', fontSize: '1.25rem' }}>No sales data available</p>
        </div>
      ) : (
        <>
          {/* Month Summary Stats */}
          {activeMonth && salesByMonth[activeMonth] && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ color: 'white', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    Cash Collected
                  </h3>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                  ₹{calculateMonthTotals(salesByMonth[activeMonth].sales).cash.toFixed(2)}
                </p>
              </div>

              <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <CreditCard size={20} />
                  <h3 style={{ color: 'white', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    UPI Collected
                  </h3>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                  ₹{calculateMonthTotals(salesByMonth[activeMonth].sales).upi.toFixed(2)}
                </p>
              </div>

              <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <TrendingUp size={20} />
                  <h3 style={{ color: 'white', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    Credit Given
                  </h3>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                  ₹{calculateMonthTotals(salesByMonth[activeMonth].sales).credit.toFixed(2)}
                </p>
              </div>

              <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <FileText size={20} />
                  <h3 style={{ color: 'white', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    Total Collection
                  </h3>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                  ₹{(calculateMonthTotals(salesByMonth[activeMonth].sales).cash +
                     calculateMonthTotals(salesByMonth[activeMonth].sales).upi -
                     calculateMonthTotals(salesByMonth[activeMonth].sales).credit).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Month Tabs */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            overflowX: 'auto',
            flexWrap: 'wrap',
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            borderBottom: '3px solid #000'
          }}>
            {monthKeys.map(monthKey => (
              <button
                key={monthKey}
                onClick={() => setActiveMonth(monthKey)}
                style={{
                  padding: '1rem 2rem',
                  background: activeMonth === monthKey ? '#000' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: activeMonth === monthKey ? 'white' : '#666',
                  fontWeight: activeMonth === monthKey ? '700' : '600',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  transition: 'all 0.3s',
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Calendar size={18} />
                {salesByMonth[monthKey].label}
              </button>
            ))}
          </div>

          {/* Active Month Table */}
          {activeMonth && salesByMonth[activeMonth] && (
            <div className="table-container" style={{
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e0e0e0'
            }}>
              <table className="table" style={{ marginBottom: 0 }}>
                <thead style={{ backgroundColor: '#000' }}>
                  <tr>
                    <th style={{ color: 'white', padding: '1.25rem 1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={16} />
                        Date
                      </div>
                    </th>
                    <th style={{ color: 'white', padding: '1.25rem 1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={16} />
                        User
                      </div>
                    </th>
                    <th style={{ color: 'white', padding: '1.25rem 1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Cash
                      </div>
                    </th>
                    <th style={{ color: 'white', padding: '1.25rem 1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CreditCard size={16} />
                        UPI
                      </div>
                    </th>
                    <th style={{ color: 'white', padding: '1.25rem 1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={16} />
                        Credit
                      </div>
                    </th>
                    <th style={{ color: 'white', padding: '1.25rem 1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} />
                        Total
                      </div>
                    </th>
                    <th style={{ color: 'white', padding: '1.25rem 1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {salesByMonth[activeMonth].sales.map((sale, index) => {
                    const creditSum = calculateCreditSum(sale);
                    const total = parseFloat(sale.cash_collected || 0) +
                                  parseFloat(sale.upi || 0) -
                                  creditSum;

                    return (
                      <tr
                        key={sale.id}
                        onClick={() => handleRowClick(sale)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: index % 2 === 0 ? 'white' : '#fafafa',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f7ff';
                          e.currentTarget.style.transform = 'scale(1.01)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#fafafa';
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <td style={{ padding: '1rem', fontWeight: '600' }}>{new Date(sale.date).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem' }}>{sale.username || 'N/A'}</td>
                        <td style={{ padding: '1rem', color: '#000', fontWeight: '600' }}>₹{parseFloat(sale.cash_collected || 0).toFixed(2)}</td>
                        <td style={{ padding: '1rem', color: '#4CAF50', fontWeight: '600' }}>₹{parseFloat(sale.upi || 0).toFixed(2)}</td>
                        <td style={{ padding: '0.5rem 1rem', color: '#ff9800', fontWeight: '600' }}>
                          {Array.isArray(sale.credit) && sale.credit.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {sale.credit.map((item, idx) => (
                                <div key={idx} style={{ fontSize: '0.875rem' }}>
                                  {getCreditHolderName(item.credit_holder_id)} → ₹{parseFloat(item.creditgiven || 0).toFixed(2)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            '₹0.00'
                          )}
                        </td>
                        <td style={{ padding: '1rem', fontWeight: '700', fontSize: '1.125rem', color: '#2196F3' }}>₹{total.toFixed(2)}</td>
                        <td style={{ padding: '1rem', color: '#666', fontSize: '0.875rem' }}>{new Date(sale.created_at).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: '700', backgroundColor: '#000', color: 'white' }}>
                    <td colSpan="2" style={{ padding: '1.25rem 1rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Month Total</td>
                    <td style={{ padding: '1.25rem 1rem', fontSize: '1rem' }}>₹{calculateMonthTotals(salesByMonth[activeMonth].sales).cash.toFixed(2)}</td>
                    <td style={{ padding: '1.25rem 1rem', fontSize: '1rem' }}>₹{calculateMonthTotals(salesByMonth[activeMonth].sales).upi.toFixed(2)}</td>
                    <td style={{ padding: '1.25rem 1rem', fontSize: '1rem' }}>₹{calculateMonthTotals(salesByMonth[activeMonth].sales).credit.toFixed(2)}</td>
                    <td style={{ padding: '1.25rem 1rem', fontSize: '1.25rem', fontWeight: '700' }}>
                      ₹{(calculateMonthTotals(salesByMonth[activeMonth].sales).cash +
                         calculateMonthTotals(salesByMonth[activeMonth].sales).upi -
                         calculateMonthTotals(salesByMonth[activeMonth].sales).credit).toFixed(2)}
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      {/* Detailed Sales Modal */}
      {selectedSale && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              maxWidth: '1000px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '0',
              position: 'relative',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
              color: 'white',
              padding: '2rem',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              position: 'relative'
            }}>
              <button
                onClick={closeModal}
                style={{
                  position: 'absolute',
                  top: '1.5rem',
                  right: '1.5rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                <X size={20} />
              </button>

              <h2 style={{ color: 'white', margin: 0, fontWeight: '700', fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={28} />
                Sales Report
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '0.5rem 0 0 0', fontSize: '1rem' }}>
                {new Date(selectedSale.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '2rem' }}>
              {/* Basic Info */}
              <div style={{
                marginBottom: '2rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderRadius: '12px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: '#000', color: 'white', borderRadius: '8px', padding: '0.5rem', display: 'flex' }}>
                      <User size={20} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>User</p>
                      <p style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#000' }}>{selectedSale.username || 'N/A'}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: '#2196F3', color: 'white', borderRadius: '8px', padding: '0.5rem', display: 'flex' }}>
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</p>
                      <p style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#000' }}>{new Date(selectedSale.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: '#4CAF50', color: 'white', borderRadius: '8px', padding: '0.5rem', display: 'flex' }}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submitted</p>
                      <p style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#000' }}>{new Date(selectedSale.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Table - Combined View */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#000', fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={24} style={{ color: '#000' }} />
                  Product Sales Details
                </h3>
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '2px solid #000', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }}>
                  <table className="table" style={{ marginBottom: 0 }}>
                    <thead style={{ backgroundColor: '#000' }}>
                      <tr>
                        <th style={{ color: 'white', padding: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Product</th>
                        <th style={{ color: 'white', padding: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <Package size={16} />
                            Opening Stock
                          </div>
                        </th>
                        <th style={{ color: 'white', padding: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <Package size={16} />
                            Closing Stock
                          </div>
                        </th>
                        <th style={{ color: 'white', padding: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={16} />
                            Sale
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.opening_stock && Array.isArray(selectedSale.opening_stock) && selectedSale.opening_stock.map((openingItem, index) => {
                        const closingItem = selectedSale.closing_stock?.find(c => c.product_id === openingItem.product_id);
                        const saleItem = selectedSale.sale?.find(s => s.product_id === openingItem.product_id);

                        return (
                          <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                            <td style={{ padding: '1rem', fontWeight: '700', fontSize: '1rem' }}>{getProductName(openingItem.product_id)}</td>
                            <td style={{
                              padding: '1rem',
                              textAlign: 'center',
                              fontWeight: '700',
                              fontSize: '1.125rem',
                              color: '#2196F3',
                              backgroundColor: index % 2 === 0 ? '#e3f2fd' : '#bbdefb'
                            }}>
                              {parseFloat(openingItem.opening_stock || 0).toFixed(2)}
                            </td>
                            <td style={{
                              padding: '1rem',
                              textAlign: 'center',
                              fontWeight: '700',
                              fontSize: '1.125rem',
                              color: '#ff9800',
                              backgroundColor: index % 2 === 0 ? '#fff3e0' : '#ffe0b2'
                            }}>
                              {closingItem ? parseFloat(closingItem.closing_stock || 0).toFixed(2) : '0.00'}
                            </td>
                            <td style={{
                              padding: '1rem',
                              textAlign: 'center',
                              fontWeight: '700',
                              fontSize: '1.25rem',
                              color: '#4CAF50',
                              backgroundColor: index % 2 === 0 ? '#e8f5e9' : '#c8e6c9'
                            }}>
                              {saleItem ? parseFloat(saleItem.sale || 0).toFixed(2) : '0.00'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Collections */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#000', fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Collections
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                  <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)', color: 'white', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <p style={{ color: 'white', fontSize: '0.875rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cash Collected</p>
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                      ₹{parseFloat(selectedSale.cash_collected || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)', color: 'white', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <CreditCard size={20} />
                      <p style={{ color: 'white', fontSize: '0.875rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>UPI Collected</p>
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                      ₹{parseFloat(selectedSale.upi || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Credit Given */}
              {selectedSale.credit && Array.isArray(selectedSale.credit) && selectedSale.credit.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#000', fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={22} style={{ color: '#ff9800' }} />
                    Credit Given
                  </h3>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                    <table className="table" style={{ marginBottom: 0 }}>
                      <thead style={{ backgroundColor: '#ff9800' }}>
                        <tr>
                          <th style={{ color: 'white', padding: '1rem' }}>Credit Holder</th>
                          <th style={{ color: 'white', padding: '1rem' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSale.credit.map((item, index) => (
                          <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                            <td style={{ padding: '0.875rem', fontWeight: '600' }}>{getCreditHolderName(item.credit_holder_id)}</td>
                            <td style={{ padding: '0.875rem', fontWeight: '700', fontSize: '1.125rem', color: '#ff9800' }}>₹{parseFloat(item.creditgiven || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ fontWeight: '700', backgroundColor: '#ff9800', color: 'white' }}>
                          <td style={{ padding: '1rem' }}>Total</td>
                          <td style={{ padding: '1rem', fontSize: '1.25rem' }}>₹{calculateCreditSum(selectedSale).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Remarks */}
              {selectedSale.remarks && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#000', fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare size={22} style={{ color: '#9c27b0' }} />
                    Remarks
                  </h3>
                  <div style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                    borderRadius: '12px',
                    border: '2px solid #9c27b0',
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    color: '#333'
                  }}>
                    {selectedSale.remarks}
                  </div>
                </div>
              )}

              {/* Total Summary */}
              <div className="card" style={{
                background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                color: 'white',
                padding: '2rem',
                textAlign: 'center',
                boxShadow: '0 8px 24px rgba(33, 150, 243, 0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <FileText size={28} />
                  <h3 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: 'white', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Total Collection
                  </h3>
                </div>
                <p style={{ fontSize: '3rem', fontWeight: '700', margin: 0 }}>
                  ₹{(parseFloat(selectedSale.cash_collected || 0) +
                     parseFloat(selectedSale.upi || 0) -
                     calculateCreditSum(selectedSale)).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SalesReportTab;
