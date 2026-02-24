import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Wallet, TrendingUp, DollarSign, Calendar, AlertCircle } from 'lucide-react';

const BalanceTab = () => {
  const [balances, setBalances] = useState([]);
  const [organisation, setOrganisation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBalance, setSelectedBalance] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [balancesRes, orgRes] = await Promise.all([
        api.get('/balances'),
        api.get('/balances/organisation') // Get org balance data
      ]);

      setBalances(balancesRes.data);
      setOrganisation(orgRes.data);
      setError('');
    } catch (err) {
      console.error('Error fetching balance data:', err);
      setError(err.response?.data?.error || 'Failed to load balance data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading">Loading balance data...</div>;
  }

  return (
    <div className="balance-tab">
      {error && (
        <div className="error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} style={{ marginRight: '0.5rem' }} />
          {error}
        </div>
      )}

      {/* Organisation Balance Summary */}
      <div className="balance-summary" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>
          Organisation Balance Summary
          <span style={{ fontSize: '0.875rem', color: '#666', marginLeft: '1rem' }}>
            (संगठन शेष सारांश)
          </span>
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Cash Balance Card */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <Wallet size={32} style={{ marginRight: '1rem' }} />
              <div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  Cash Balance / नकद शेष
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: '700', marginTop: '0.25rem' }}>
                  {formatCurrency(organisation?.cashBalance || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Bank Balance Card */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <TrendingUp size={32} style={{ marginRight: '1rem' }} />
              <div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  Bank Balance / बैंक शेष
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: '700', marginTop: '0.25rem' }}>
                  {formatCurrency(organisation?.bankBalance || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Gala Balance Card */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <DollarSign size={32} style={{ marginRight: '1rem' }} />
              <div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  Gala Balance / गला शेष
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: '700', marginTop: '0.25rem' }}>
                  {formatCurrency(organisation?.galaBalance || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Balance */}
        <div className="card" style={{
          marginTop: '1.5rem',
          padding: '1rem 1.5rem',
          background: '#f8f9fa',
          border: '2px solid #000'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '1.25rem',
            fontWeight: '600'
          }}>
            <span>Total Balance / कुल शेष:</span>
            <span style={{ color: '#000' }}>
              {formatCurrency(
                parseFloat(organisation?.cashBalance || 0) +
                parseFloat(organisation?.bankBalance || 0) +
                parseFloat(organisation?.galaBalance || 0)
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Daily Balance Allocations */}
      <div className="balance-history">
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>
          Daily Balance Allocations
          <span style={{ fontSize: '0.875rem', color: '#666', marginLeft: '1rem' }}>
            (दैनिक शेष आवंटन)
          </span>
        </h2>

        {balances.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <Calendar size={48} style={{ color: '#ccc', margin: '0 auto 1rem' }} />
            <p style={{ color: '#666' }}>
              No balance allocations recorded yet / अभी तक कोई शेष आवंटन दर्ज नहीं किया गया
            </p>
            <p style={{ color: '#999', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Balance allocations are created when you add balances to sales entries
            </p>
          </div>
        ) : (
          <div className="desktop-only">
            <table className="table">
              <thead>
                <tr>
                  <th>Date / तारीख</th>
                  <th>Cash Balance / नकद</th>
                  <th>Bank Balance / बैंक</th>
                  <th>Gala Balance / गला</th>
                  <th>Total / कुल</th>
                  <th>Actions / क्रियाएं</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((balance) => {
                  const total =
                    parseFloat(balance.cash_balance || 0) +
                    parseFloat(balance.bank_balance || 0) +
                    parseFloat(balance.gala_balance || 0);

                  return (
                    <tr key={balance.id}>
                      <td>{formatDate(balance.date)}</td>
                      <td>{formatCurrency(balance.cash_balance)}</td>
                      <td>{formatCurrency(balance.bank_balance)}</td>
                      <td>{formatCurrency(balance.gala_balance)}</td>
                      <td style={{ fontWeight: '600' }}>{formatCurrency(total)}</td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                          onClick={() => setSelectedBalance(balance)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile View */}
        {balances.length > 0 && (
          <div className="mobile-only">
            {balances.map((balance) => {
              const total =
                parseFloat(balance.cash_balance || 0) +
                parseFloat(balance.bank_balance || 0) +
                parseFloat(balance.gala_balance || 0);

              return (
                <div key={balance.id} className="card" style={{ marginBottom: '1rem' }}>
                  <div style={{ marginBottom: '0.75rem', fontSize: '1.125rem', fontWeight: '600' }}>
                    {formatDate(balance.date)}
                  </div>
                  <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#666' }}>Cash / नकद:</span>
                      <span style={{ fontWeight: '600' }}>{formatCurrency(balance.cash_balance)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#666' }}>Bank / बैंक:</span>
                      <span style={{ fontWeight: '600' }}>{formatCurrency(balance.bank_balance)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#666' }}>Gala / गला:</span>
                      <span style={{ fontWeight: '600' }}>{formatCurrency(balance.gala_balance)}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid #eee',
                      marginTop: '0.5rem'
                    }}>
                      <span style={{ fontWeight: '600' }}>Total / कुल:</span>
                      <span style={{ fontWeight: '700', fontSize: '1rem' }}>{formatCurrency(total)}</span>
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ marginTop: '1rem', width: '100%' }}
                    onClick={() => setSelectedBalance(balance)}
                  >
                    View Details / विवरण देखें
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Balance Details Modal */}
      {selectedBalance && (
        <div className="modal-overlay" onClick={() => setSelectedBalance(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1.5rem' }}>
              Balance Details / शेष विवरण
            </h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Date / तारीख:</strong> {formatDate(selectedBalance.date)}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Cash Balance / नकद शेष:</strong> {formatCurrency(selectedBalance.cash_balance)}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Bank Balance / बैंक शेष:</strong> {formatCurrency(selectedBalance.bank_balance)}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Gala Balance / गला शेष:</strong> {formatCurrency(selectedBalance.gala_balance)}
              </div>
              <div style={{
                paddingTop: '1rem',
                borderTop: '2px solid #000',
                fontSize: '1.125rem',
                fontWeight: '600'
              }}>
                <strong>Total / कुल:</strong> {formatCurrency(
                  parseFloat(selectedBalance.cash_balance || 0) +
                  parseFloat(selectedBalance.bank_balance || 0) +
                  parseFloat(selectedBalance.gala_balance || 0)
                )}
              </div>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => setSelectedBalance(null)}
              style={{ width: '100%' }}
            >
              Close / बंद करें
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceTab;
