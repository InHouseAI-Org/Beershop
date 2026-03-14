import { useState, useEffect } from 'react';
import api from '../../utils/api';

const BalanceSheetTab = () => {
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBalanceSheet();
  }, []);

  const fetchBalanceSheet = async () => {
    try {
      const response = await api.get('/balance-sheet');
      setBalanceSheet(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch balance sheet');
      console.error('Error fetching balance sheet:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading balance sheet...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: '#dc3545' }}>{error}</div>;
  }

  if (!balanceSheet) {
    return <div style={{ padding: '2rem' }}>No data available</div>;
  }

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
  };

  return (
    <div style={{ padding: '0' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h2 style={{ margin: 0 }}>Balance Sheet</h2>
        <div style={{ fontSize: '0.875rem', color: '#666' }}>
          As of: {new Date(balanceSheet.asOfDate).toLocaleDateString()}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* ASSETS */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            margin: '0 0 1.5rem 0',
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#28a745',
            borderBottom: '3px solid #28a745',
            paddingBottom: '0.5rem'
          }}>
            Assets
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px'
            }}>
              <span style={{ fontWeight: '500', color: '#495057' }}>Inventory Value</span>
              <span style={{ fontWeight: '700', fontSize: '1.125rem', color: '#212529' }}>
                {formatCurrency(balanceSheet.assets.inventoryValue)}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px'
            }}>
              <span style={{ fontWeight: '500', color: '#495057' }}>Schemes To Be Availed</span>
              <span style={{ fontWeight: '700', fontSize: '1.125rem', color: '#212529' }}>
                {formatCurrency(balanceSheet.assets.schemesToBeAvailed)}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px'
            }}>
              <span style={{ fontWeight: '500', color: '#495057' }}>Bank Balance</span>
              <span style={{ fontWeight: '700', fontSize: '1.125rem', color: '#212529' }}>
                {formatCurrency(balanceSheet.assets.bankBalance)}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px'
            }}>
              <span style={{ fontWeight: '500', color: '#495057' }}>Cash Balance</span>
              <span style={{ fontWeight: '700', fontSize: '1.125rem', color: '#212529' }}>
                {formatCurrency(balanceSheet.assets.cashBalance)}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px'
            }}>
              <span style={{ fontWeight: '500', color: '#495057' }}>Gala Balance</span>
              <span style={{ fontWeight: '700', fontSize: '1.125rem', color: '#212529' }}>
                {formatCurrency(balanceSheet.assets.galaBalance)}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px'
            }}>
              <span style={{ fontWeight: '500', color: '#495057' }}>Credit To Be Collected</span>
              <span style={{ fontWeight: '700', fontSize: '1.125rem', color: '#212529' }}>
                {formatCurrency(balanceSheet.assets.creditToCollect)}
              </span>
            </div>

            {/* Total Assets */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              backgroundColor: '#28a745',
              borderRadius: '6px',
              marginTop: '0.5rem'
            }}>
              <span style={{ fontWeight: '700', fontSize: '1.125rem', color: '#fff' }}>Total Assets</span>
              <span style={{ fontWeight: '700', fontSize: '1.5rem', color: '#fff' }}>
                {formatCurrency(balanceSheet.assets.total)}
              </span>
            </div>
          </div>
        </div>

        {/* LIABILITIES */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            margin: '0 0 1.5rem 0',
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#dc3545',
            borderBottom: '3px solid #dc3545',
            paddingBottom: '0.5rem'
          }}>
            Liabilities
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px'
            }}>
              <span style={{ fontWeight: '500', color: '#495057' }}>Amount Payable to Distributors</span>
              <span style={{ fontWeight: '700', fontSize: '1.125rem', color: '#212529' }}>
                {formatCurrency(balanceSheet.liabilities.amountPayable)}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px'
            }}>
              <span style={{ fontWeight: '500', color: '#495057' }}>Recurring Expenses (This Month)</span>
              <span style={{ fontWeight: '700', fontSize: '1.125rem', color: '#212529' }}>
                {formatCurrency(balanceSheet.liabilities.monthlyRecurring)}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px'
            }}>
              <span style={{ fontWeight: '500', color: '#495057' }}>Recurring Expenses (Financial Year)</span>
              <span style={{ fontWeight: '700', fontSize: '1.125rem', color: '#212529' }}>
                {formatCurrency(balanceSheet.liabilities.yearlyRecurring)}
              </span>
            </div>

            {/* Total Liabilities */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              backgroundColor: '#dc3545',
              borderRadius: '6px',
              marginTop: '0.5rem'
            }}>
              <span style={{ fontWeight: '700', fontSize: '1.125rem', color: '#fff' }}>Total Liabilities</span>
              <span style={{ fontWeight: '700', fontSize: '1.5rem', color: '#fff' }}>
                {formatCurrency(balanceSheet.liabilities.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Net Worth */}
      <div style={{
        marginTop: '2rem',
        backgroundColor: balanceSheet.netWorth >= 0 ? '#d4edda' : '#f8d7da',
        border: `2px solid ${balanceSheet.netWorth >= 0 ? '#28a745' : '#dc3545'}`,
        borderRadius: '8px',
        padding: '1.5rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '1rem', fontWeight: '600', color: '#495057', marginBottom: '0.5rem' }}>
          Net Worth (Assets - Liabilities)
        </div>
        <div style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: balanceSheet.netWorth >= 0 ? '#28a745' : '#dc3545'
        }}>
          {formatCurrency(balanceSheet.netWorth)}
        </div>
      </div>

      {/* Refresh Button */}
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button
          onClick={fetchBalanceSheet}
          className="btn btn-primary"
          style={{ padding: '0.75rem 2rem' }}
        >
          Refresh Balance Sheet
        </button>
      </div>
    </div>
  );
};

export default BalanceSheetTab;
