import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

const BalanceLedgerTab = () => {
  const [selectedBalance, setSelectedBalance] = useState('cash'); // cash, bank, gala
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBalance]);

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

  const getTransactionColor = (type) => {
    // Red/Orange for debits (money going out)
    const debitTypes = ['expense', 'balance_transfer_debit', 'prepaid_expense', 'recurring_expense'];
    // Green for credits (money coming in)
    const creditTypes = ['balance_transfer_credit', 'distributor_payment', 'miscellaneous_income', 'credit_collection', 'daily_allocation'];

    if (debitTypes.includes(type)) {
      return '#fff3e0'; // Light orange
    } else if (creditTypes.includes(type)) {
      return '#e8f5e9'; // Light green
    }
    return '#ffffff';
  };

  const getBalanceDisplayName = (type) => {
    const names = {
      'cash': 'Cash Balance | नकद शेष',
      'bank': 'Bank Balance | बैंक शेष',
      'gala': 'Gala Balance | गला शेष'
    };
    return names[type] || type;
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h2 style={{ margin: 0 }}>Balance Ledger | शेष खाता</h2>
      </div>

      {/* Balance Type Selector */}
      <div style={{
        marginBottom: '20px',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        {['cash', 'bank', 'gala'].map(type => (
          <button
            key={type}
            onClick={() => setSelectedBalance(type)}
            style={{
              padding: '10px 20px',
              backgroundColor: selectedBalance === type ? '#007bff' : '#f8f9fa',
              color: selectedBalance === type ? '#ffffff' : '#333',
              border: selectedBalance === type ? '2px solid #0056b3' : '1px solid #dee2e6',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: selectedBalance === type ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            {getBalanceDisplayName(type)}
          </button>
        ))}
      </div>

      {/* Date Range Filter */}
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '5px',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
          Filter by Date Range | तारीख सीमा द्वारा फ़िल्टर करें
        </div>
        <div style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              Start Date | आरंभ तारीख
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ced4da'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              End Date | समाप्ति तारीख
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ced4da'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <button
              onClick={handleApplyDateFilter}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Apply | लागू करें
            </button>
            <button
              onClick={handleClearDateFilter}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear | साफ़ करें
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Loading...
        </div>
      )}

      {/* Ledger Content */}
      {!loading && ledgerData && (
        <div>
          {/* Balance Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{
              padding: '15px',
              backgroundColor: '#e3f2fd',
              borderRadius: '5px',
              border: '1px solid #90caf9'
            }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                Opening Balance | प्रारंभिक शेष
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0d47a1' }}>
                {formatCurrency(ledgerData.openingBalance)}
              </div>
            </div>
            <div style={{
              padding: '15px',
              backgroundColor: '#e8f5e9',
              borderRadius: '5px',
              border: '1px solid #81c784'
            }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                Closing Balance | अंतिम शेष
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32' }}>
                {formatCurrency(ledgerData.closingBalance)}
              </div>
            </div>
            <div style={{
              padding: '15px',
              backgroundColor: '#fff3e0',
              borderRadius: '5px',
              border: '1px solid #ffb74d'
            }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                Net Change | शुद्ध परिवर्तन
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: (ledgerData.closingBalance - ledgerData.openingBalance) >= 0 ? '#2e7d32' : '#d32f2f'
              }}>
                {formatCurrency(ledgerData.closingBalance - ledgerData.openingBalance)}
              </div>
            </div>
            <div style={{
              padding: '15px',
              backgroundColor: '#f3e5f5',
              borderRadius: '5px',
              border: '1px solid #ba68c8'
            }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                Total Transactions | कुल लेनदेन
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6a1b9a' }}>
                {ledgerData.totalTransactions}
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          {ledgerData.transactions.length > 0 ? (
            <div style={{
              overflowX: 'auto',
              border: '1px solid #dee2e6',
              borderRadius: '5px'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: '#ffffff'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={headerStyle}>Date | तारीख</th>
                    <th style={headerStyle}>Type | प्रकार</th>
                    <th style={headerStyle}>Description | विवरण</th>
                    <th style={headerStyle}>Debit | डेबिट</th>
                    <th style={headerStyle}>Credit | क्रेडिट</th>
                    <th style={headerStyle}>Balance | शेष</th>
                    <th style={headerStyle}>Notes | नोट्स</th>
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
                          backgroundColor: getTransactionColor(transaction.transaction_type),
                          borderBottom: '1px solid #dee2e6'
                        }}
                      >
                        <td style={cellStyle}>
                          {formatDate(transaction.transaction_date)}
                        </td>
                        <td style={cellStyle}>
                          <span style={{
                            padding: '4px 8px',
                            backgroundColor: isDebit ? '#ffebee' : '#e8f5e9',
                            color: isDebit ? '#c62828' : '#2e7d32',
                            borderRadius: '3px',
                            fontSize: '12px',
                            fontWeight: 'bold'
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
                          fontWeight: isDebit ? 'bold' : 'normal'
                        }}>
                          {isDebit ? formatCurrency(transaction.debit_amount) : '-'}
                        </td>
                        <td style={{
                          ...cellStyle,
                          color: '#2e7d32',
                          fontWeight: isCredit ? 'bold' : 'normal'
                        }}>
                          {isCredit ? formatCurrency(transaction.credit_amount) : '-'}
                        </td>
                        <td style={{
                          ...cellStyle,
                          color: '#0d47a1',
                          fontWeight: 'bold'
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
          ) : (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              borderRadius: '5px',
              border: '1px solid #dee2e6'
            }}>
              <p style={{ fontSize: '18px', color: '#666' }}>
                No transactions found for the selected period.
              </p>
              <p style={{ fontSize: '14px', color: '#999' }}>
                कोई लेनदेन नहीं मिला
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Styles
const headerStyle = {
  padding: '12px',
  textAlign: 'left',
  fontWeight: 'bold',
  borderBottom: '2px solid #dee2e6',
  fontSize: '14px'
};

const cellStyle = {
  padding: '12px',
  fontSize: '14px'
};

export default BalanceLedgerTab;
