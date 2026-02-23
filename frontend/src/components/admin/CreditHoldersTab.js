import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

const CreditHoldersTab = () => {
  const [creditHolders, setCreditHolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showCreditHolderHistory, setShowCreditHolderHistory] = useState(false);
  const [selectedCreditHolder, setSelectedCreditHolder] = useState(null);
  const [creditHolderHistory, setCreditHolderHistory] = useState([]);
  const [editingCreditHolder, setEditingCreditHolder] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    amountPayable: ''
  });
  const [collectData, setCollectData] = useState({
    creditHolderId: '',
    amountCollected: ''
  });

  useEffect(() => {
    fetchCreditHolders();
  }, []);

  const fetchCreditHolders = async () => {
    try {
      const response = await api.get('/credit-holders');
      setCreditHolders(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch credit holders');
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditHolderHistory = async (creditHolderId) => {
    try {
      const response = await api.get(`/credit-holders/${creditHolderId}/history`);
      setCreditHolderHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch credit holder history:', err);
      setError('Failed to fetch credit history');
    }
  };

  const handleShowCreditHolderHistory = async (creditHolder) => {
    setSelectedCreditHolder(creditHolder);
    await fetchCreditHolderHistory(creditHolder.id);
    setShowCreditHolderHistory(true);
  };

  const handleCloseCreditHolderHistory = () => {
    setShowCreditHolderHistory(false);
    setSelectedCreditHolder(null);
    setCreditHolderHistory([]);
  };

  const handleOpenModal = (creditHolder = null) => {
    if (creditHolder) {
      setEditingCreditHolder(creditHolder);
      setFormData({
        name: creditHolder.name,
        address: creditHolder.address || '',
        phone: creditHolder.phone || '',
        amountPayable: creditHolder.amount_payable || ''
      });
    } else {
      setEditingCreditHolder(null);
      setFormData({
        name: '',
        address: '',
        phone: '',
        amountPayable: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCreditHolder(null);
    setFormData({
      name: '',
      address: '',
      phone: '',
      amountPayable: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingCreditHolder) {
        await api.put(`/credit-holders/${editingCreditHolder.id}`, formData);
      } else {
        await api.post('/credit-holders', formData);
      }
      await fetchCreditHolders();
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleOpenCollectModal = () => {
    setCollectData({
      creditHolderId: '',
      amountCollected: ''
    });
    setShowCollectModal(true);
    setError('');
    setSuccess('');
  };

  const handleCloseCollectModal = () => {
    setShowCollectModal(false);
    setCollectData({
      creditHolderId: '',
      amountCollected: ''
    });
  };

  const handleCollectCredit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!collectData.creditHolderId || !collectData.amountCollected) {
      setError('Please select a credit holder and enter amount');
      return;
    }

    const amountCollected = parseFloat(collectData.amountCollected);
    if (amountCollected <= 0) {
      setError('Amount collected must be greater than 0');
      return;
    }

    const selectedHolder = creditHolders.find(ch => ch.id === collectData.creditHolderId);
    if (!selectedHolder) {
      setError('Credit holder not found');
      return;
    }

    const currentPayable = parseFloat(selectedHolder.amount_payable || 0);
    if (amountCollected > currentPayable) {
      setError(`Amount collected (₹${amountCollected.toFixed(2)}) cannot exceed outstanding payable (₹${currentPayable.toFixed(2)})`);
      return;
    }

    try {
      await api.post('/credit-holders/collect', {
        creditHolderId: collectData.creditHolderId,
        amountCollected: amountCollected
      });

      setSuccess(`Successfully collected ₹${amountCollected.toFixed(2)} from ${selectedHolder.name}`);
      await fetchCreditHolders();
      handleCloseCollectModal();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to collect credit');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: '#000', margin: 0, fontSize: '2rem', fontWeight: '700', letterSpacing: '0.5px' }}>Credit Holders</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleOpenCollectModal}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#4CAF50',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600'
            }}
          >
            Collect Credit
          </button>
          <button onClick={() => handleOpenModal()} className="btn btn-success">
            Add New Credit Holder
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Amount Payable</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {creditHolders.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  No credit holders found. Create your first credit holder!
                </td>
              </tr>
            ) : (
              creditHolders.map(creditHolder => (
                <tr
                  key={creditHolder.id}
                  onClick={() => handleShowCreditHolderHistory(creditHolder)}
                  style={{
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                  title="Click to view credit history"
                >
                  <td>{creditHolder.name}</td>
                  <td>{creditHolder.address || '-'}</td>
                  <td>{creditHolder.phone || '-'}</td>
                  <td>₹{parseFloat(creditHolder.amount_payable || 0).toFixed(2)}</td>
                  <td>{new Date(creditHolder.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(creditHolder);
                      }}
                      className="btn btn-primary"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>


      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingCreditHolder ? 'Edit Credit Holder' : 'Add New Credit Holder'}</h2>
            {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  className="form-control"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  className="form-control"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              {editingCreditHolder && (
                <div className="form-group">
                  <label htmlFor="amountPayable">Amount Payable (Read-Only)</label>
                  <input
                    type="number"
                    id="amountPayable"
                    className="form-control"
                    value={formData.amountPayable}
                    readOnly
                    style={{
                      backgroundColor: '#e9ecef',
                      cursor: 'not-allowed',
                      fontWeight: '600',
                      color: '#000'
                    }}
                  />
                  <small style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>
                    Amount payable is automatically calculated from credits given and collections
                  </small>
                </div>
              )}

              <div className="modal-buttons">
                <button type="submit" className="btn btn-primary">
                  {editingCreditHolder ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCollectModal && (
        <div className="modal-overlay" onClick={handleCloseCollectModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Collect Credit</h2>
            </div>

            {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}
            {success && <div className="success" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '8px', border: '1px solid #c3e6cb' }}>{success}</div>}

            <form onSubmit={handleCollectCredit}>
              <div className="form-group">
                <label htmlFor="creditHolder">Select Credit Holder</label>
                <select
                  id="creditHolder"
                  className="form-control"
                  value={collectData.creditHolderId}
                  onChange={(e) => setCollectData({ ...collectData, creditHolderId: e.target.value })}
                  required
                  style={{ padding: '0.75rem', fontSize: '1rem' }}
                >
                  <option value="">-- Select Credit Holder --</option>
                  {creditHolders
                    .filter(ch => parseFloat(ch.amount_payable || 0) > 0)
                    .map(ch => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name} - Outstanding: ₹{parseFloat(ch.amount_payable || 0).toFixed(2)}
                      </option>
                    ))}
                </select>
              </div>

              {collectData.creditHolderId && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  border: '1px solid #dee2e6'
                }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Outstanding Payable</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#000' }}>
                    ₹{parseFloat(creditHolders.find(ch => ch.id === collectData.creditHolderId)?.amount_payable || 0).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="amountCollected">Amount Collected</label>
                <input
                  type="number"
                  id="amountCollected"
                  className="form-control"
                  value={collectData.amountCollected}
                  onChange={(e) => setCollectData({ ...collectData, amountCollected: e.target.value })}
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Enter amount collected"
                  style={{ padding: '0.75rem', fontSize: '1rem' }}
                />
              </div>

              {collectData.creditHolderId && collectData.amountCollected && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#e8f5e9',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  border: '1px solid #4CAF50'
                }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#2e7d32' }}>New Outstanding After Collection</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1b5e20' }}>
                    ₹{(parseFloat(creditHolders.find(ch => ch.id === collectData.creditHolderId)?.amount_payable || 0) - parseFloat(collectData.amountCollected || 0)).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="modal-buttons">
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    background: '#4CAF50',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem'
                  }}
                >
                  Collect Credit
                </button>
                <button type="button" onClick={handleCloseCollectModal} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreditHolderHistory && selectedCreditHolder && (
        <div className="modal-overlay" onClick={handleCloseCreditHolderHistory}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Credit History - {selectedCreditHolder.name}</h2>
              <button
                onClick={handleCloseCreditHolderHistory}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Close
              </button>
            </div>

            {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <div style={{
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #dee2e6'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Contact</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem', fontWeight: '600' }}>
                    {selectedCreditHolder.phone || 'N/A'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Current Outstanding</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.25rem', fontWeight: '700', color: '#dc3545' }}>
                    ₹{parseFloat(selectedCreditHolder.amount_payable || 0).toFixed(2)}
                  </p>
                </div>
              </div>
              {selectedCreditHolder.address && (
                <div style={{ marginTop: '0.75rem' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Address</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem' }}>
                    {selectedCreditHolder.address}
                  </p>
                </div>
              )}
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              Transaction History ({creditHolderHistory.length} records)
            </h3>

            {creditHolderHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                No transaction history found for this credit holder
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="table">
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                    <tr>
                      <th>Date & Time</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Previous Balance</th>
                      <th>New Balance</th>
                      <th>User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditHolderHistory.map(record => {
                      const transactionType = record.transaction_type || 'collected';
                      const isGiven = transactionType === 'given';
                      return (
                        <tr key={record.id}>
                          <td>{new Date(record.collected_at).toLocaleString()}</td>
                          <td>
                            <span style={{
                              borderRadius: '4px',
                              fontSize: '8px',
                              fontWeight: '600',
                              color: isGiven ? '#856404' : '#155724',
                              border: isGiven ? '1px solid #ffc107' : '1px solid #4CAF50'
                            }}>
                              {isGiven ? 'Credit Given' : 'Credit Collected'}
                            </span>
                          </td>
                          <td style={{ color: isGiven ? '#dc3545' : '#4CAF50', fontWeight: '700' }}>
                            {isGiven ? '+' : '-'}₹{parseFloat(record.amount_collected).toFixed(2)}
                          </td>
                          <td>₹{parseFloat(record.previous_outstanding).toFixed(2)}</td>
                          <td>₹{parseFloat(record.new_outstanding).toFixed(2)}</td>
                          <td>{record.collected_by_name}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {creditHolderHistory.length > 0 && (
              <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#fff3cd',
                  borderRadius: '8px',
                  border: '1px solid #ffc107'
                }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#856404' }}>Total Credit Given</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#856404' }}>
                    ₹{creditHolderHistory
                      .filter(r => (r.transaction_type || 'collected') === 'given')
                      .reduce((sum, record) => sum + parseFloat(record.amount_collected), 0)
                      .toFixed(2)}
                  </p>
                </div>
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#e8f5e9',
                  borderRadius: '8px',
                  border: '1px solid #4CAF50'
                }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#2e7d32' }}>Total Credit Collected</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#1b5e20' }}>
                    ₹{creditHolderHistory
                      .filter(r => (r.transaction_type || 'collected') === 'collected')
                      .reduce((sum, record) => sum + parseFloat(record.amount_collected), 0)
                      .toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CreditHoldersTab;
