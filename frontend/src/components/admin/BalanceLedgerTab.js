import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Calendar, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';

const BalanceLedgerTab = () => {
  const [selectedBalance, setSelectedBalance] = useState('cash');
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  useEffect(() => {
    fetchLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBalance]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('cards');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchLedger = async (startDate = '', endDate = '') => {
    try {
      setLoading(true);
      setError('');

      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('start_date', startDate);
      if (endDate) queryParams.append('end_date', endDate);
      const queryString = queryParams.toString();

      const response = await api.get(
        `/balance-ledger/${selectedBalance}/ledger${queryString ? '?' + queryString : ''}`
      );
      setLedgerData(response.data);
    } catch (err) {
      console.error('Failed to fetch balance ledger:', err);
      setError('Failed to fetch balance ledger');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (field, value) => {
    const newDateRange = { ...dateRange, [field]: value };
    setDateRange(newDateRange);
  };

  const handleApplyDateFilter = () => {
    fetchLedger(dateRange.startDate, dateRange.endDate);
  };

  const handleClearDateFilter = () => {
    setDateRange({ startDate: '', endDate: '' });
    fetchLedger('', '');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTransactionTypeDisplay = (type) => {
    const typeMap = {
      'expense': 'Expense',
      'daily_allocation': 'Daily Allocation',
      'balance_transfer_debit': 'Transfer Out',
      'balance_transfer_credit': 'Transfer In',
      'distributor_payment': 'Distributor Payment',
      'miscellaneous_income': 'Miscellaneous Income',
      'credit_collection': 'Credit Collection',
      'prepaid_expense': 'Prepaid Expense',
      'recurring_expense': 'Recurring Expense'
    };
    return typeMap[type] || type;
  };

  const getBalanceDisplayName = (type) => {
    const names = {
      'cash': 'Cash Balance',
      'bank': 'Bank Balance',
      'gala': 'Gala Balance'
    };
    return names[type] || type;
  };

  const getBalanceHindi = (type) => {
    const names = {
      'cash': 'नकद शेष',
      'bank': 'बैंक शेष',
      'gala': 'गला शेष'
    };
    return names[type] || type;
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
      {/* Header */}
      <h2 style={{
        color: '#000',
        margin: 0,
        fontSize: isMobile ? '1.5rem' : '2rem',
        fontWeight: '700',
        letterSpacing: '0.5px',
        marginBottom: '0.5rem'
      }}>
        Balance Ledger
      </h2>
      <p style={{
        color: '#666',
        fontSize: isMobile ? '0.875rem' : '1rem',
        marginBottom: isMobile ? '1.5rem' : '2rem'
      }}>
        शेष खाता
      </p>

      {/* Balance Type Selector */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: '1rem',
        marginBottom: isMobile ? '1.5rem' : '2rem'
      }}>
        {['cash', 'bank', 'gala'].map(type => (
          <button
            key={type}
            onClick={() => setSelectedBalance(type)}
            className="card"
            style={{
              padding: isMobile ? '1rem' : '1.5rem',
              margin: 0,
              cursor: 'pointer',
              border: selectedBalance === type ? '2px solid #000' : '1px solid #e0e0e0',
              backgroundColor: selectedBalance === type ? '#000' : 'white',
              color: selectedBalance === type ? 'white' : '#000',
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <DollarSign size={isMobile ? 28 : 32} />
            <div style={{
              fontSize: isMobile ? '1rem' : '1.125rem',
              fontWeight: '700',
              textAlign: 'center'
            }}>
              {getBalanceDisplayName(type)}
            </div>
            <div style={{
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              opacity: 0.8
            }}>
              {getBalanceHindi(type)}
            </div>
          </button>
        ))}
      </div>

      {/* Date Range Filter */}
      <div className="card" style={{
        padding: isMobile ? '1rem' : '1.5rem',
        marginBottom: isMobile ? '1.5rem' : '2rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
          fontWeight: '700',
          fontSize: isMobile ? '1rem' : '1.125rem'
        }}>
          <Calendar size={20} />
          Filter by Date Range
          <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: '#666' }}>
            | तारीख सीमा द्वारा फ़िल्टर करें
          </span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr) auto',
          gap: isMobile ? '1rem' : '1.5rem',
          alignItems: 'end'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: '600',
              color: '#333'
            }}>
              Start Date <span style={{ fontSize: '0.75rem', color: '#666' }}>| आरंभ तारीख</span>
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              style={{
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #e0e0e0',
                width: '100%',
                fontSize: isMobile ? '0.875rem' : '1rem'
              }}
            />
          </div>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: '600',
              color: '#333'
            }}>
              End Date <span style={{ fontSize: '0.75rem', color: '#666' }}>| समाप्ति तारीख</span>
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              style={{
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #e0e0e0',
                width: '100%',
                fontSize: isMobile ? '0.875rem' : '1rem'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexDirection: isMobile ? 'column' : 'row' }}>
            <button
              onClick={handleApplyDateFilter}
              className="btn btn-primary"
              style={{
                padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                fontSize: isMobile ? '0.875rem' : '1rem',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              Apply | लागू करें
            </button>
            <button
              onClick={handleClearDateFilter}
              className="btn btn-secondary"
              style={{
                padding: isMobile ? '0.75rem' : '0.75rem 1.5rem',
                fontSize: isMobile ? '0.875rem' : '1rem',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              Clear | साफ़ करें
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card" style={{
          padding: isMobile ? '1rem' : '1.5rem',
          backgroundColor: '#FFF3E0',
          borderLeft: '4px solid #FF9800',
          marginBottom: isMobile ? '1.5rem' : '2rem',
          color: '#E65100'
        }}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="card" style={{
          padding: isMobile ? '2rem' : '3rem',
          textAlign: 'center',
          color: '#666'
        }}>
          Loading ledger data...
        </div>
      )}

      {/* Ledger Content */}
      {!loading && ledgerData && (
        <div>
          {/* Balance Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
            gap: '1rem',
            marginBottom: isMobile ? '1.5rem' : '2rem'
          }}>
            <div className="card" style={{
              padding: isMobile ? '1rem' : '1.5rem',
              margin: 0,
              background: 'linear-gradient(135deg, #000 0%, #333 100%)',
              color: 'white'
            }}>
              <div style={{
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                opacity: 0.8,
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Opening Balance
              </div>
              <div style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '700',
                marginBottom: '0.25rem'
              }}>
                {formatCurrency(ledgerData.openingBalance)}
              </div>
              <div style={{ fontSize: isMobile ? '0.625rem' : '0.75rem', opacity: 0.7 }}>
                प्रारंभिक शेष
              </div>
            </div>

            <div className="card" style={{
              padding: isMobile ? '1rem' : '1.5rem',
              margin: 0,
              background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
              color: 'white'
            }}>
              <div style={{
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                opacity: 0.8,
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Closing Balance
              </div>
              <div style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '700',
                marginBottom: '0.25rem'
              }}>
                {formatCurrency(ledgerData.closingBalance)}
              </div>
              <div style={{ fontSize: isMobile ? '0.625rem' : '0.75rem', opacity: 0.7 }}>
                अंतिम शेष
              </div>
            </div>

            <div className="card" style={{
              padding: isMobile ? '1rem' : '1.5rem',
              margin: 0,
              background: (ledgerData.closingBalance - ledgerData.openingBalance) >= 0
                ? 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)'
                : 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
              color: 'white'
            }}>
              <div style={{
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                opacity: 0.8,
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {(ledgerData.closingBalance - ledgerData.openingBalance) >= 0 ? (
                  <TrendingUp size={16} />
                ) : (
                  <TrendingDown size={16} />
                )}
                Net Change
              </div>
              <div style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '700',
                marginBottom: '0.25rem'
              }}>
                {formatCurrency(ledgerData.closingBalance - ledgerData.openingBalance)}
              </div>
              <div style={{ fontSize: isMobile ? '0.625rem' : '0.75rem', opacity: 0.7 }}>
                शुद्ध परिवर्तन
              </div>
            </div>

            <div className="card" style={{
              padding: isMobile ? '1rem' : '1.5rem',
              margin: 0,
              background: 'linear-gradient(135deg, #6a1b9a 0%, #9c27b0 100%)',
              color: 'white'
            }}>
              <div style={{
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                opacity: 0.8,
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Transactions
              </div>
              <div style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '700',
                marginBottom: '0.25rem'
              }}>
                {ledgerData.totalTransactions}
              </div>
              <div style={{ fontSize: isMobile ? '0.625rem' : '0.75rem', opacity: 0.7 }}>
                कुल लेनदेन
              </div>
            </div>
          </div>

          {/* View Mode Toggle for Desktop */}
          {!isMobile && (
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <button
                onClick={() => setViewMode('cards')}
                className="btn"
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: viewMode === 'cards' ? '#000' : 'white',
                  color: viewMode === 'cards' ? 'white' : '#000',
                  border: '2px solid #000',
                  width: 'auto'
                }}
              >
                Card View
              </button>
              <button
                onClick={() => setViewMode('table')}
                className="btn"
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: viewMode === 'table' ? '#000' : 'white',
                  color: viewMode === 'table' ? 'white' : '#000',
                  border: '2px solid #000',
                  width: 'auto'
                }}
              >
                Table View
              </button>
            </div>
          )}

          {/* Transactions */}
          {ledgerData.transactions.length > 0 ? (
            viewMode === 'cards' || isMobile ? (
              // Card View
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '1rem'
              }}>
                {ledgerData.transactions.map((transaction, index) => {
                  const isDebit = transaction.debit_amount > 0;
                  const isCredit = transaction.credit_amount > 0;

                  return (
                    <div
                      key={transaction.id || index}
                      className="card"
                      style={{
                        padding: isMobile ? '1rem' : '1.5rem',
                        margin: 0,
                        borderLeft: `4px solid ${isDebit ? '#d32f2f' : '#2e7d32'}`,
                        position: 'relative'
                      }}
                    >
                      {/* Transaction Type Badge */}
                      <div style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        padding: '0.25rem 0.75rem',
                        backgroundColor: isDebit ? '#ffebee' : '#e8f5e9',
                        color: isDebit ? '#c62828' : '#2e7d32',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        {isDebit ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                        {isDebit ? 'Debit' : 'Credit'}
                      </div>

                      {/* Date */}
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#666',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <Calendar size={14} />
                        {formatDate(transaction.transaction_date)}
                      </div>

                      {/* Transaction Type */}
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: '700',
                        marginBottom: '0.5rem',
                        color: '#000'
                      }}>
                        {getTransactionTypeDisplay(transaction.transaction_type)}
                      </div>

                      {/* Description */}
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#666',
                        marginBottom: '1rem',
                        lineHeight: '1.5'
                      }}>
                        {transaction.description || 'No description'}
                      </div>

                      {/* Amount and Balance */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid #e0e0e0'
                      }}>
                        <div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#666',
                            marginBottom: '0.25rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {isDebit ? 'Debit' : 'Credit'}
                          </div>
                          <div style={{
                            fontSize: '1.125rem',
                            fontWeight: '700',
                            color: isDebit ? '#d32f2f' : '#2e7d32'
                          }}>
                            {isDebit
                              ? formatCurrency(transaction.debit_amount)
                              : formatCurrency(transaction.credit_amount)
                            }
                          </div>
                        </div>
                        <div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#666',
                            marginBottom: '0.25rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Balance
                          </div>
                          <div style={{
                            fontSize: '1.125rem',
                            fontWeight: '700',
                            color: '#000'
                          }}>
                            {formatCurrency(transaction.running_balance)}
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {transaction.notes && (
                        <div style={{
                          marginTop: '1rem',
                          padding: '0.75rem',
                          backgroundColor: '#f5f5f5',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          color: '#666',
                          fontStyle: 'italic'
                        }}>
                          <strong>Notes:</strong> {transaction.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // Table View
              <div className="card" style={{ padding: 0, margin: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f5f5f5' }}>
                        <th style={headerStyle}>Date</th>
                        <th style={headerStyle}>Type</th>
                        <th style={headerStyle}>Description</th>
                        <th style={headerStyle}>Debit</th>
                        <th style={headerStyle}>Credit</th>
                        <th style={headerStyle}>Balance</th>
                        <th style={headerStyle}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerData.transactions.map((transaction, index) => {
                        const isDebit = transaction.debit_amount > 0;
                        const isCredit = transaction.credit_amount > 0;

                        return (
                          <tr
                            key={transaction.id || index}
                            style={{
                              borderBottom: '1px solid #e0e0e0',
                              transition: 'background-color 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td style={cellStyle}>
                              {formatDate(transaction.transaction_date)}
                            </td>
                            <td style={cellStyle}>
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                backgroundColor: isDebit ? '#ffebee' : '#e8f5e9',
                                color: isDebit ? '#c62828' : '#2e7d32',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}>
                                {getTransactionTypeDisplay(transaction.transaction_type)}
                              </span>
                            </td>
                            <td style={cellStyle}>
                              {transaction.description || '-'}
                            </td>
                            <td style={{
                              ...cellStyle,
                              color: '#d32f2f',
                              fontWeight: isDebit ? '700' : 'normal'
                            }}>
                              {isDebit ? formatCurrency(transaction.debit_amount) : '-'}
                            </td>
                            <td style={{
                              ...cellStyle,
                              color: '#2e7d32',
                              fontWeight: isCredit ? '700' : 'normal'
                            }}>
                              {isCredit ? formatCurrency(transaction.credit_amount) : '-'}
                            </td>
                            <td style={{
                              ...cellStyle,
                              color: '#000',
                              fontWeight: '700'
                            }}>
                              {formatCurrency(transaction.running_balance)}
                            </td>
                            <td style={cellStyle}>
                              {transaction.notes || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            <div className="card" style={{
              padding: isMobile ? '2rem' : '3rem',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '1.125rem', color: '#666', marginBottom: '0.5rem' }}>
                No transactions found for the selected period.
              </p>
              <p style={{ fontSize: '0.875rem', color: '#999' }}>
                कोई लेनदेन नहीं मिला
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Table Styles
const headerStyle = {
  padding: '1rem',
  textAlign: 'left',
  fontWeight: '700',
  borderBottom: '2px solid #e0e0e0',
  fontSize: '0.875rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#333'
};

const cellStyle = {
  padding: '1rem',
  fontSize: '0.875rem',
  color: '#333'
};

export default BalanceLedgerTab;
