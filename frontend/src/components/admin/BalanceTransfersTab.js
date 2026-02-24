import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatDate } from '../../utils/dateUtils';

const BalanceTransfersTab = () => {
  const [transfers, setTransfers] = useState([]);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    fromAccount: '',
    toAccount: '',
    transactionDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transfersRes, balancesRes] = await Promise.all([
        api.get('/balance-transfers'),
        api.get('/balances/organisation')
      ]);
      setTransfers(transfersRes.data);
      setBalances(balancesRes.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = async () => {
    setFormData({
      name: '',
      description: '',
      amount: '',
      fromAccount: '',
      toAccount: '',
      transactionDate: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
    setError('');
    setSuccess('');

    // Refresh balances from database to ensure we have the latest data
    try {
      const balancesRes = await api.get('/balances/organisation');
      setBalances(balancesRes.data);
    } catch (err) {
      console.error('Failed to refresh balances:', err);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      name: '',
      description: '',
      amount: '',
      fromAccount: '',
      toAccount: '',
      transactionDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.post('/balance-transfers', formData);
      setSuccess('Balance transfer created successfully!');
      await fetchData();
      handleCloseModal();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create transfer');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transfer? This will reverse the balance changes.')) {
      return;
    }

    try {
      await api.delete(`/balance-transfers/${id}`);
      setSuccess('Transfer deleted successfully!');
      await fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete transfer');
    }
  };

  const getAccountLabel = (account) => {
    const labels = {
      cash_balance: 'Cash Balance',
      bank_balance: 'Bank Balance',
      gala_balance: 'Gala Balance'
    };
    return labels[account] || account;
  };

  const getAccountColor = (account) => {
    const colors = {
      cash_balance: '#4CAF50',
      bank_balance: '#2196F3',
      gala_balance: '#9C27B0'
    };
    return colors[account] || '#666';
  };

  const getBalance = (account) => {
    if (!balances) return 0;
    // Map snake_case account names to camelCase balance properties
    const accountMap = {
      'cash_balance': 'cashBalance',
      'bank_balance': 'bankBalance',
      'gala_balance': 'galaBalance'
    };
    const balanceKey = accountMap[account];
    return parseFloat(balances[balanceKey] || 0);
  };

  const calculateNewBalance = (account, isFromAccount) => {
    const currentBalance = getBalance(account);
    const amount = parseFloat(formData.amount || 0);

    if (isFromAccount) {
      return currentBalance - amount;
    } else {
      return currentBalance + amount;
    }
  };

  const hasInsufficientBalance = () => {
    if (!formData.fromAccount || !formData.amount) return false;
    const currentBalance = getBalance(formData.fromAccount);
    const amount = parseFloat(formData.amount || 0);
    return amount > currentBalance;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: '#000', margin: 0, fontSize: '2rem', fontWeight: '700', letterSpacing: '0.5px' }}>
          Balance Transfers
        </h2>
        <button onClick={handleOpenModal} className="btn btn-success">
          Add New Transfer
        </button>
      </div>

      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && (
        <div className="success" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '8px', border: '1px solid #c3e6cb' }}>
          {success}
        </div>
      )}

      {/* Current Balances */}
      {balances && (
        <div style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1.5rem', backgroundColor: '#e8f5e9', borderRadius: '12px', border: '2px solid #4CAF50' }}>
            <div style={{ fontSize: '0.875rem', color: '#2e7d32', marginBottom: '0.5rem', fontWeight: '600' }}>
              Cash Balance
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1b5e20' }}>
              ₹{parseFloat(balances.cashBalance || 0).toFixed(2)}
            </div>
          </div>
          <div style={{ padding: '1.5rem', backgroundColor: '#e3f2fd', borderRadius: '12px', border: '2px solid #2196F3' }}>
            <div style={{ fontSize: '0.875rem', color: '#1565c0', marginBottom: '0.5rem', fontWeight: '600' }}>
              Bank Balance
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#0d47a1' }}>
              ₹{parseFloat(balances.bankBalance || 0).toFixed(2)}
            </div>
          </div>
          <div style={{ padding: '1.5rem', backgroundColor: '#f3e5f5', borderRadius: '12px', border: '2px solid #9C27B0' }}>
            <div style={{ fontSize: '0.875rem', color: '#6a1b9a', marginBottom: '0.5rem', fontWeight: '600' }}>
              Gala Balance
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#4a148c' }}>
              ₹{parseFloat(balances.galaBalance || 0).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Transfers Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Description</th>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Created By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  No balance transfers found. Create your first transfer!
                </td>
              </tr>
            ) : (
              transfers.map(transfer => (
                <tr key={transfer.id}>
                  <td>{formatDate(transfer.transaction_date)}</td>
                  <td style={{ fontWeight: '600' }}>{transfer.name}</td>
                  <td>{transfer.description || '-'}</td>
                  <td>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      backgroundColor: `${getAccountColor(transfer.from_account)}20`,
                      color: getAccountColor(transfer.from_account),
                      fontWeight: '600',
                      border: `1px solid ${getAccountColor(transfer.from_account)}`
                    }}>
                      {getAccountLabel(transfer.from_account)}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      backgroundColor: `${getAccountColor(transfer.to_account)}20`,
                      color: getAccountColor(transfer.to_account),
                      fontWeight: '600',
                      border: `1px solid ${getAccountColor(transfer.to_account)}`
                    }}>
                      {getAccountLabel(transfer.to_account)}
                    </span>
                  </td>
                  <td style={{ fontWeight: '700', color: '#e65100', fontSize: '1.125rem' }}>
                    ₹{parseFloat(transfer.amount).toFixed(2)}
                  </td>
                  <td>{transfer.created_by_name || '-'}</td>
                  <td>
                    <button
                      onClick={() => handleDelete(transfer.id)}
                      className="btn btn-danger"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Transfer Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Balance Transfer</h2>
            {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Transfer Name</label>
                <input
                  type="text"
                  id="name"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Bank to Gala Transfer"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description (Optional)</label>
                <textarea
                  id="description"
                  className="form-control"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  placeholder="Additional notes about this transfer"
                />
              </div>

              <div className="form-group">
                <label htmlFor="fromAccount">From Account</label>
                <select
                  id="fromAccount"
                  className="form-control"
                  value={formData.fromAccount}
                  onChange={(e) => setFormData({ ...formData, fromAccount: e.target.value })}
                  required
                >
                  <option value="">Select account</option>
                  <option value="cash_balance">Cash Balance</option>
                  <option value="bank_balance">Bank Balance</option>
                  <option value="gala_balance">Gala Balance</option>
                </select>
                {formData.fromAccount && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: `${getAccountColor(formData.fromAccount)}15`,
                    borderRadius: '6px',
                    border: `1px solid ${getAccountColor(formData.fromAccount)}`
                  }}>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      Available Balance
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: getAccountColor(formData.fromAccount) }}>
                      ₹{getBalance(formData.fromAccount).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="toAccount">To Account</label>
                <select
                  id="toAccount"
                  className="form-control"
                  value={formData.toAccount}
                  onChange={(e) => setFormData({ ...formData, toAccount: e.target.value })}
                  required
                  style={{
                    borderColor: (formData.fromAccount && formData.toAccount && formData.fromAccount === formData.toAccount) ? '#dc3545' : undefined,
                    borderWidth: (formData.fromAccount && formData.toAccount && formData.fromAccount === formData.toAccount) ? '2px' : undefined
                  }}
                >
                  <option value="">Select account</option>
                  <option value="cash_balance">Cash Balance</option>
                  <option value="bank_balance">Bank Balance</option>
                  <option value="gala_balance">Gala Balance</option>
                </select>
                {formData.fromAccount && formData.toAccount && formData.fromAccount === formData.toAccount && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: '#ffebee',
                    borderRadius: '6px',
                    border: '1px solid #dc3545',
                    color: '#dc3545',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    ⚠️ From and To accounts must be different!
                  </div>
                )}
                {formData.toAccount && formData.fromAccount !== formData.toAccount && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: `${getAccountColor(formData.toAccount)}15`,
                    borderRadius: '6px',
                    border: `1px solid ${getAccountColor(formData.toAccount)}`
                  }}>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      Current Balance
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: getAccountColor(formData.toAccount) }}>
                      ₹{getBalance(formData.toAccount).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="amount">Amount</label>
                <input
                  type="number"
                  id="amount"
                  className="form-control"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="₹ 0.00"
                  style={{
                    borderColor: hasInsufficientBalance() ? '#dc3545' : undefined,
                    borderWidth: hasInsufficientBalance() ? '2px' : undefined
                  }}
                />
                {hasInsufficientBalance() && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: '#ffebee',
                    borderRadius: '6px',
                    border: '1px solid #dc3545',
                    color: '#dc3545',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    ⚠️ Insufficient balance! Available: ₹{getBalance(formData.fromAccount).toFixed(2)}, Required: ₹{parseFloat(formData.amount).toFixed(2)}
                  </div>
                )}
              </div>

              {/* Balance Preview After Transfer */}
              {formData.fromAccount && formData.toAccount && formData.amount && !hasInsufficientBalance() && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '2px solid #dee2e6',
                  marginBottom: '1rem'
                }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: '#666' }}>
                    Balance After Transfer
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>
                        {getAccountLabel(formData.fromAccount)}
                      </div>
                      <div style={{ fontSize: '1.125rem', fontWeight: '700', color: getAccountColor(formData.fromAccount) }}>
                        ₹{calculateNewBalance(formData.fromAccount, true).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>
                        {getAccountLabel(formData.toAccount)}
                      </div>
                      <div style={{ fontSize: '1.125rem', fontWeight: '700', color: getAccountColor(formData.toAccount) }}>
                        ₹{calculateNewBalance(formData.toAccount, false).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="transactionDate">Transaction Date</label>
                <input
                  type="date"
                  id="transactionDate"
                  className="form-control"
                  value={formData.transactionDate}
                  onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="modal-buttons">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={hasInsufficientBalance() || formData.fromAccount === formData.toAccount}
                  style={{
                    opacity: (hasInsufficientBalance() || formData.fromAccount === formData.toAccount) ? 0.5 : 1,
                    cursor: (hasInsufficientBalance() || formData.fromAccount === formData.toAccount) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Create Transfer
                </button>
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default BalanceTransfersTab;
