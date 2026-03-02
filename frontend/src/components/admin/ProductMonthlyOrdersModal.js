import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { X } from 'lucide-react';
import api from '../../utils/api';
import { formatMonthLabel } from '../../utils/formatMonth';

const ProductMonthlyOrdersModal = ({ productId, productName, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'line'

  useEffect(() => {
    fetchMonthlyOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const fetchMonthlyOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/analytics/product/${productId}/monthly-orders`);
      setData(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch monthly orders data');
      console.error('Error fetching monthly orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Calculate total orders
  const totalOrdered = data?.monthlyOrders?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  // Calculate minimum visible months (12) and total months
  const totalMonths = data?.monthlyOrders.length || 0;
  const minVisibleMonths = 12;
  const shouldScroll = totalMonths > minVisibleMonths;

  // Calculate chart width based on number of months
  const monthWidth = isMobile ? 60 : 80;
  const chartWidth = Math.max(totalMonths * monthWidth, minVisibleMonths * monthWidth);
  const chartHeight = isMobile ? 300 : 400;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: isMobile ? '1rem' : '2rem',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: isMobile ? '1.5rem' : '2rem',
          maxWidth: '1200px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem', paddingRight: '2rem' }}>
          <h2 style={{
            margin: '0 0 0.5rem 0',
            fontSize: isMobile ? '1.25rem' : '1.5rem',
            fontWeight: '700',
            color: '#000'
          }}>
            Monthly Orders: {productName}
          </h2>
          <p style={{
            margin: 0,
            fontSize: isMobile ? '0.875rem' : '1rem',
            color: '#666'
          }}>
            Tracking order quantities from distributors over time
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            Loading...
          </div>
        ) : error ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#d32f2f',
            backgroundColor: '#ffebee',
            borderRadius: '8px'
          }}>
            {error}
          </div>
        ) : data && data.monthlyOrders && data.monthlyOrders.length > 0 ? (
          <>
            {/* Summary Card */}
            <div style={{
              padding: isMobile ? '1rem' : '1.5rem',
              backgroundColor: totalOrdered === 0 ? '#fff3e0' : '#e3f2fd',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: `2px solid ${totalOrdered === 0 ? '#ff9800' : '#2196F3'}`
            }}>
              {totalOrdered === 0 && (
                <div style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#ffe0b2',
                  borderRadius: '6px',
                  border: '1px solid #ffb74d'
                }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#e65100', fontWeight: '600' }}>
                    ℹ️ No orders found for this product yet. The chart shows the tracking period with zero quantities.
                  </p>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#1565c0', fontWeight: '600' }}>
                    Total Ordered
                  </p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: isMobile ? '1.75rem' : '2rem', fontWeight: '700', color: totalOrdered === 0 ? '#e65100' : '#0d47a1' }}>
                    {totalOrdered.toLocaleString()} units
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#1565c0', fontWeight: '600' }}>
                    Months Tracked
                  </p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: '700', color: '#0d47a1' }}>
                    {totalMonths}
                  </p>
                </div>
              </div>
            </div>

            {/* Chart Type Toggle */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setChartType('bar')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: chartType === 'bar' ? '#2196F3' : '#f0f0f0',
                  color: chartType === 'bar' ? 'white' : '#666',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                Bar Chart
              </button>
              <button
                onClick={() => setChartType('line')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: chartType === 'line' ? '#2196F3' : '#f0f0f0',
                  color: chartType === 'line' ? 'white' : '#666',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                Line Chart
              </button>
            </div>

            {/* Chart */}
            <div style={{
              backgroundColor: '#fafafa',
              borderRadius: '8px',
              padding: isMobile ? '0.5rem' : '1rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                fontSize: isMobile ? '1rem' : '1.125rem',
                fontWeight: '600',
                textAlign: 'center'
              }}>
                Order Quantity by Month
              </h3>
              <div style={{
                width: '100%',
                overflowX: shouldScroll ? 'auto' : 'visible',
                overflowY: 'visible'
              }}>
                <div style={{ width: shouldScroll ? `${chartWidth}px` : '100%', minWidth: '100%' }}>
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    {chartType === 'bar' ? (
                      <BarChart
                        data={data.monthlyOrders}
                        margin={{
                          top: 5,
                          right: 30,
                          left: isMobile ? 10 : 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          height={60}
                          tick={{ fontSize: isMobile ? 11 : 13, fontWeight: 800 }}
                          tickFormatter={formatMonthLabel}
                          tickMargin={10}
                        />
                        <YAxis
                          tick={{ fontSize: isMobile ? 10 : 12 }}
                          label={{
                            value: 'Quantity Ordered',
                            angle: -90,
                            position: 'insideLeft',
                            style: { fontSize: isMobile ? 10 : 12 }
                          }}
                          domain={[0, 'auto']}
                        />
                        <Tooltip
                          formatter={(value) => [value.toLocaleString(), 'Quantity']}
                          contentStyle={{ fontSize: isMobile ? 11 : 14 }}
                          wrapperStyle={{ zIndex: 1000 }}
                        />
                        <Bar dataKey="quantity" fill="#2196F3" />
                      </BarChart>
                    ) : (
                      <LineChart
                        data={data.monthlyOrders}
                        margin={{
                          top: 5,
                          right: 30,
                          left: isMobile ? 10 : 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          height={60}
                          tick={{ fontSize: isMobile ? 11 : 13, fontWeight: 800 }}
                          tickFormatter={formatMonthLabel}
                          tickMargin={10}
                        />
                        <YAxis
                          tick={{ fontSize: isMobile ? 10 : 12 }}
                          label={{
                            value: 'Quantity Ordered',
                            angle: -90,
                            position: 'insideLeft',
                            style: { fontSize: isMobile ? 10 : 12 }
                          }}
                          domain={[0, 'auto']}
                        />
                        <Tooltip
                          formatter={(value) => [value.toLocaleString(), 'Quantity']}
                          contentStyle={{ fontSize: isMobile ? 11 : 14 }}
                          wrapperStyle={{ zIndex: 1000 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="quantity"
                          stroke="#2196F3"
                          strokeWidth={2}
                          dot={{ r: 4, fill: '#2196F3' }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
              {shouldScroll && (
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', fontStyle: 'italic', textAlign: 'center', color: '#666' }}>
                  ← Scroll horizontally to view all months →
                </p>
              )}
            </div>

            {/* Monthly List */}
            <div style={{
              backgroundColor: '#fafafa',
              borderRadius: '8px',
              padding: isMobile ? '0.5rem' : '1rem'
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                fontSize: isMobile ? '1rem' : '1.125rem',
                fontWeight: '600',
                textAlign: 'center'
              }}>
                Monthly Order Details
              </h3>
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                backgroundColor: 'white'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: isMobile ? '0.875rem' : '1rem'
                }}>
                  <thead style={{
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#2196F3',
                    color: 'white',
                    zIndex: 1
                  }}>
                    <tr>
                      <th style={{
                        padding: isMobile ? '0.5rem' : '0.75rem',
                        textAlign: 'left',
                        fontWeight: '600'
                      }}>
                        Month
                      </th>
                      <th style={{
                        padding: isMobile ? '0.5rem' : '0.75rem',
                        textAlign: 'right',
                        fontWeight: '600'
                      }}>
                        Quantity Ordered
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthlyOrders.slice().reverse().map((item, index) => (
                      <tr
                        key={item.month}
                        style={{
                          backgroundColor: index % 2 === 0 ? 'white' : '#f9f9f9',
                          borderBottom: '1px solid #e0e0e0'
                        }}
                      >
                        <td style={{ padding: isMobile ? '0.5rem' : '0.75rem', fontWeight: '600' }}>
                          {formatMonthLabel(item.month)}
                        </td>
                        <td style={{
                          padding: isMobile ? '0.5rem' : '0.75rem',
                          textAlign: 'right',
                          fontWeight: '700',
                          color: item.quantity > 0 ? '#2196F3' : '#999'
                        }}>
                          {item.quantity > 0 ? item.quantity.toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#666',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px'
          }}>
            <p style={{ margin: 0, fontSize: '1rem' }}>No order data available for this product</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductMonthlyOrdersModal;
