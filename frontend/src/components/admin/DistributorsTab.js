import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import MobileTable from '../common/MobileTable';

const DistributorsTab = () => {
  const [distributors, setDistributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDistributorHistory, setShowDistributorHistory] = useState(false);
  const [selectedDistributor, setSelectedDistributor] = useState(null);
  const [distributorHistory, setDistributorHistory] = useState([]);
  const [editingDistributor, setEditingDistributor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amountOutstanding: ''
  });
  const [paymentData, setPaymentData] = useState({
    distributorId: '',
    amountPaid: '',
    paidFrom: 'cash_balance'
  });

  useEffect(() => {
    fetchDistributors();
  }, []);

  const fetchDistributors = async () => {
    try {
      const response = await api.get('/distributors');
      setDistributors(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch distributors');
    } finally {
      setLoading(false);
    }
  };

  const fetchDistributorHistory = async (distributorId) => {
    try {
      const response = await api.get(`/distributors/${distributorId}/history`);
      setDistributorHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch distributor history:', err);
      setError('Failed to fetch payment history');
    }
  };

  const handleShowDistributorHistory = async (distributor) => {
    setSelectedDistributor(distributor);
    await fetchDistributorHistory(distributor.id);
    setShowDistributorHistory(true);
  };

  const handleCloseDistributorHistory = () => {
    setShowDistributorHistory(false);
    setSelectedDistributor(null);
    setDistributorHistory([]);
  };

  const handleOpenModal = (distributor = null) => {
    if (distributor) {
      setEditingDistributor(distributor);
      setFormData({
        name: distributor.name,
        amountOutstanding: distributor.amount_outstanding || ''
      });
    } else {
      setEditingDistributor(null);
      setFormData({
        name: '',
        amountOutstanding: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDistributor(null);
    setFormData({
      name: '',
      amountOutstanding: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingDistributor) {
        await api.put(`/distributors/${editingDistributor.id}`, formData);
      } else {
        await api.post('/distributors', formData);
      }
      await fetchDistributors();
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleOpenPaymentModal = () => {
    setPaymentData({
      distributorId: '',
      amountPaid: '',
      paidFrom: 'cash_balance'
    });
    setShowPaymentModal(true);
    setError('');
    setSuccess('');
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentData({
      distributorId: '',
      amountPaid: '',
      paidFrom: 'cash_balance'
    });
  };

  const handlePayDistributor = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!paymentData.distributorId || !paymentData.amountPaid) {
      setError('Please select a distributor and enter amount');
      return;
    }

    const amountPaid = parseFloat(paymentData.amountPaid);
    if (amountPaid <= 0) {
      setError('Amount paid must be greater than 0');
      return;
    }

    const selectedDistributor = distributors.find(d => d.id === paymentData.distributorId);
    if (!selectedDistributor) {
      setError('Distributor not found');
      return;
    }

    const currentOutstanding = parseFloat(selectedDistributor.amount_outstanding || 0);
    if (amountPaid > currentOutstanding) {
      setError(`Amount paid (₹${amountPaid.toFixed(2)}) cannot exceed outstanding (₹${currentOutstanding.toFixed(2)})`);
      return;
    }

    try {
      await api.post('/distributors/pay', {
        distributorId: paymentData.distributorId,
        amountPaid: amountPaid,
        paidFrom: paymentData.paidFrom
      });

      setSuccess(`Successfully paid ₹${amountPaid.toFixed(2)} to ${selectedDistributor.name}`);
      await fetchDistributors();
      handleClosePaymentModal();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record payment');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const columns = [
    { key: 'name', label: 'Name' },
    {
      key: 'amount_outstanding',
      label: 'Amount Outstanding',
      render: (dist) => (
        <span style={{ fontWeight: '700', color: '#e91e63', fontSize: '1.125rem' }}>
          ₹{parseFloat(dist.amount_outstanding || 0).toFixed(2)}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (dist) => new Date(dist.created_at).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (dist) => (
        <div className="action-buttons">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShowDistributorHistory(dist);
            }}
            className="btn btn-primary"
          >
            History
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenModal(dist);
            }}
            className="btn btn-secondary"
          >
            Edit
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      {success && <div className="success" style={{ marginBottom: '1rem' }}>{success}</div>}
      {error && !showModal && !showPaymentModal && (
        <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>
      )}

      <div className="mobile-stack" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
        <h2 style={{ color: '#000', margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: '700', letterSpacing: '0.5px' }}>
          Distributors
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleOpenPaymentModal}
            className="btn btn-primary"
            style={{ background: '#2196F3', borderColor: '#2196F3' }}
          >
            Pay Distributor
          </button>
          <button onClick={() => handleOpenModal()} className="btn btn-success">
            Add New
          </button>
        </div>
      </div>

      <MobileTable
        columns={columns}
        data={distributors}
        onRowClick={handleShowDistributorHistory}
        enableSearch={true}
        enableSort={true}
        defaultSortKey="name"
        defaultSortOrder="asc"
      />

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingDistributor ? 'Edit Distributor' : 'Add New Distributor'}</h2>
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

              {!editingDistributor && (
                <div className="form-group">
                  <label htmlFor="amountOutstanding">Initial Outstanding Amount (Optional)</label>
                  <input
                    type="number"
                    id="amountOutstanding"
                    className="form-control"
                    value={formData.amountOutstanding}
                    onChange={(e) => setFormData({ ...formData, amountOutstanding: e.target.value })}
                    step="0.01"
                    min="0.01"
                    placeholder="₹ 0.00"
                  />
                  <small style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>
                    Set the initial outstanding amount if you already owe this distributor money
                  </small>
                </div>
              )}

              {editingDistributor && (
                <div className="form-group">
                  <label htmlFor="amountOutstanding">Amount Outstanding (Read-Only)</label>
                  <input
                    type="number"
                    id="amountOutstanding"
                    className="form-control"
                    value={formData.amountOutstanding}
                    readOnly
                    style={{
                      backgroundColor: '#e9ecef',
                      cursor: 'not-allowed',
                      fontWeight: '600',
                      color: '#000'
                    }}
                  />
                  <small style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>
                    Outstanding is automatically calculated from orders and payments
                  </small>
                </div>
              )}

              <div className="modal-buttons">
                <button type="submit" className="btn btn-primary">
                  {editingDistributor ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay" onClick={handleClosePaymentModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Pay Distributor</h2>
            </div>

            {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}
            {success && <div className="success" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '8px', border: '1px solid #c3e6cb' }}>{success}</div>}

            <form onSubmit={handlePayDistributor}>
              <div className="form-group">
                <label htmlFor="distributor">Select Distributor</label>
                <select
                  id="distributor"
                  className="form-control"
                  value={paymentData.distributorId}
                  onChange={(e) => setPaymentData({ ...paymentData, distributorId: e.target.value })}
                  required
                  style={{ padding: '0.75rem', fontSize: '1rem' }}
                >
                  <option value="">-- Select Distributor --</option>
                  {distributors
                    .filter(d => parseFloat(d.amount_outstanding || 0) > 0)
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} - Outstanding: ₹{parseFloat(d.amount_outstanding || 0).toFixed(2)}
                      </option>
                    ))}
                </select>
              </div>

              {paymentData.distributorId && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  border: '1px solid #dee2e6'
                }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Current Outstanding</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#000' }}>
                    ₹{parseFloat(distributors.find(d => d.id === paymentData.distributorId)?.amount_outstanding || 0).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="amountPaid">Amount Paid</label>
                <input
                  type="number"
                  id="amountPaid"
                  className="form-control"
                  value={paymentData.amountPaid}
                  onChange={(e) => setPaymentData({ ...paymentData, amountPaid: e.target.value })}
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Enter amount paid"
                  style={{ padding: '0.75rem', fontSize: '1rem' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="paidFrom">Paid From | से भुगतान</label>
                <select
                  id="paidFrom"
                  className="form-control"
                  value={paymentData.paidFrom}
                  onChange={(e) => setPaymentData({ ...paymentData, paidFrom: e.target.value })}
                  required
                  style={{ padding: '0.75rem', fontSize: '1rem' }}
                >
                  <option value="cash_balance">Cash Balance | नकद शेष</option>
                  <option value="bank_balance">Bank Balance | बैंक शेष</option>
                  <option value="gala_balance">Gala Balance | गला शेष</option>
                </select>
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: '#fff3cd',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  color: '#856404'
                }}>
                  💡 Select which balance account to deduct this payment from
                </div>
              </div>

              {paymentData.distributorId && paymentData.amountPaid && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  border: '1px solid #2196F3'
                }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#1565c0' }}>New Outstanding After Payment</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#0d47a1' }}>
                    ₹{(parseFloat(distributors.find(d => d.id === paymentData.distributorId)?.amount_outstanding || 0) - parseFloat(paymentData.amountPaid || 0)).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="modal-buttons">
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    background: '#2196F3',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem'
                  }}
                >
                  Pay Distributor
                </button>
                <button type="button" onClick={handleClosePaymentModal} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDistributorHistory && selectedDistributor && (
        <div className="modal-overlay" onClick={handleCloseDistributorHistory}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Payment History - {selectedDistributor.name}</h2>
              <button
                onClick={handleCloseDistributorHistory}
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
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Current Outstanding</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.25rem', fontWeight: '700', color: '#dc3545' }}>
                    ₹{parseFloat(selectedDistributor.amount_outstanding || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Created</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem', fontWeight: '600' }}>
                    {new Date(selectedDistributor.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              Payment History ({distributorHistory.length} records)
            </h3>

            {distributorHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                No payment history found for this distributor
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="table">
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                    <tr>
                      <th>Date & Time</th>
                      <th>Amount Paid</th>
                      <th>Paid From</th>
                      <th>Previous Balance</th>
                      <th>New Balance</th>
                      <th>Paid By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributorHistory.map(record => {
                      const paidFromDisplay = record.paid_from === 'cash_balance' ? 'Cash' :
                        record.paid_from === 'bank_balance' ? 'Bank' :
                        record.paid_from === 'gala_balance' ? 'Gala' : '-';

                      return (
                        <tr key={record.id}>
                          <td>{new Date(record.paid_at).toLocaleString()}</td>
                          <td style={{ color: '#2196F3', fontWeight: '700' }}>
                            ₹{parseFloat(record.amount_paid).toFixed(2)}
                          </td>
                          <td>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              backgroundColor: record.paid_from === 'cash_balance' ? '#fff3cd' :
                                record.paid_from === 'bank_balance' ? '#d1ecf1' :
                                record.paid_from === 'gala_balance' ? '#d4edda' : '#f8f9fa',
                              color: '#000',
                              fontWeight: '600'
                            }}>
                              {paidFromDisplay}
                            </span>
                          </td>
                          <td>₹{parseFloat(record.previous_outstanding).toFixed(2)}</td>
                          <td>₹{parseFloat(record.new_outstanding).toFixed(2)}</td>
                          <td>{record.paid_by_name}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {distributorHistory.length > 0 && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#e3f2fd',
                borderRadius: '8px',
                border: '1px solid #2196F3'
              }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#1565c0' }}>Total Amount Paid</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#0d47a1' }}>
                  ₹{distributorHistory.reduce((sum, record) => sum + parseFloat(record.amount_paid), 0).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DistributorsTab;
