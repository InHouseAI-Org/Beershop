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
  const [activeTab, setActiveTab] = useState('outstanding');
  const [distributorHistory, setDistributorHistory] = useState([]);
  const [distributorLedger, setDistributorLedger] = useState([]);
  const [distributorOrders, setDistributorOrders] = useState([]);
  const [unpaidBills, setUnpaidBills] = useState([]);
  const [editingDistributor, setEditingDistributor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amountOutstanding: ''
  });
  const [paymentData, setPaymentData] = useState({
    distributorId: '',
    paymentType: 'order_payment',
    amount: '',
    paymentFrom: 'bank_balance',
    billNumber: '',
    orderId: '',
    notes: ''
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
      // Fetch both payment history and ledger from NEW payment system
      const [historyRes, ledgerRes] = await Promise.all([
        api.get(`/distributor-payments/${distributorId}/payments`), // NEW endpoint
        api.get(`/distributor-payments/${distributorId}/ledger`)
      ]);
      setDistributorHistory(historyRes.data);
      setDistributorLedger(ledgerRes.data);
    } catch (err) {
      console.error('Failed to fetch distributor history:', err);
      setError('Failed to fetch payment history');
    }
  };

  const fetchUnpaidBills = async (distributorId) => {
    try {
      const response = await api.get(`/distributor-payments/${distributorId}/unpaid-bills`);
      setUnpaidBills(response.data);
    } catch (err) {
      console.error('Failed to fetch unpaid bills:', err);
      setError('Failed to fetch unpaid bills');
    }
  };

  const fetchDistributorOrders = async (distributorId) => {
    try {
      const response = await api.get('/orders');
      // Filter orders for this distributor
      const filteredOrders = response.data.filter(order => order.distributor_id === distributorId);
      setDistributorOrders(filteredOrders);
    } catch (err) {
      console.error('Failed to fetch distributor orders:', err);
      setError('Failed to fetch orders');
    }
  };

  const handleShowDistributorHistory = async (distributor) => {
    setSelectedDistributor(distributor);
    setActiveTab('outstanding');
    await Promise.all([
      fetchDistributorHistory(distributor.id),
      fetchUnpaidBills(distributor.id),
      fetchDistributorOrders(distributor.id)
    ]);
    setShowDistributorHistory(true);
  };

  const handleCloseDistributorHistory = () => {
    setShowDistributorHistory(false);
    setSelectedDistributor(null);
    setActiveTab('outstanding');
    setDistributorHistory([]);
    setDistributorLedger([]);
    setDistributorOrders([]);
    setUnpaidBills([]);
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
      paymentType: 'order_payment',
      amount: '',
      paymentFrom: 'bank_balance',
      billNumber: '',
      orderId: '',
      notes: ''
    });
    setUnpaidBills([]);
    setShowPaymentModal(true);
    setError('');
    setSuccess('');
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentData({
      distributorId: '',
      paymentType: 'order_payment',
      amount: '',
      paymentFrom: 'bank_balance',
      billNumber: '',
      orderId: '',
      notes: ''
    });
    setUnpaidBills([]);
  };

  const handlePayDistributor = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!paymentData.distributorId || !paymentData.amount) {
      setError('Please select a distributor and enter amount');
      return;
    }

    const amount = parseFloat(paymentData.amount);
    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    // Validate bill number is selected for order_payment
    if (paymentData.paymentType === 'order_payment' && !paymentData.orderId) {
      setError('Please select a bill number for order payment');
      return;
    }

    const selectedDistributor = distributors.find(d => d.id === paymentData.distributorId);
    if (!selectedDistributor) {
      setError('Distributor not found');
      return;
    }

    try {
      const requestData = {
        distributorId: paymentData.distributorId,
        paymentType: paymentData.paymentType,
        amount: amount,
        paymentFrom: paymentData.paymentFrom,
        notes: paymentData.notes || null
      };

      // Add bill-specific fields for order_payment
      if (paymentData.paymentType === 'order_payment') {
        requestData.orderId = paymentData.orderId;
        requestData.billNumber = paymentData.billNumber;
      }

      await api.post('/distributor-payments/pay', requestData);

      const paymentTypeLabel = paymentData.paymentType === 'advance' ? 'advance payment' : 'payment';
      setSuccess(`Successfully recorded ${paymentTypeLabel} of ₹${amount.toFixed(2)} for ${selectedDistributor.name}`);
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
                    min="0"
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
                  onChange={async (e) => {
                    const selectedId = e.target.value;
                    setPaymentData({ ...paymentData, distributorId: selectedId, billNumber: '', orderId: '' });
                    if (selectedId) {
                      await fetchUnpaidBills(selectedId);
                    } else {
                      setUnpaidBills([]);
                    }
                  }}
                  required
                  style={{ padding: '0.75rem', fontSize: '1rem' }}
                >
                  <option value="">-- Select Distributor --</option>
                  {distributors.map(d => (
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
                <label htmlFor="paymentType">Payment Type</label>
                <select
                  id="paymentType"
                  className="form-control"
                  value={paymentData.paymentType}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentType: e.target.value, billNumber: '', orderId: '' })}
                  required
                  style={{ padding: '0.75rem', fontSize: '1rem' }}
                >
                  <option value="order_payment">Order Payment (Pay Bill)</option>
                  <option value="advance">Advance Payment</option>
                </select>
                <small style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>
                  {paymentData.paymentType === 'advance'
                    ? 'Advance payment reduces outstanding and allows negative balance'
                    : 'Pay against a specific bill/order'}
                </small>
              </div>

              {paymentData.paymentType === 'order_payment' && paymentData.distributorId && (
                <div className="form-group">
                  <label htmlFor="billNumber">Select Bill Number</label>
                  <select
                    id="billNumber"
                    className="form-control"
                    value={paymentData.orderId}
                    onChange={(e) => {
                      const selectedBill = unpaidBills.find(b => b.id === e.target.value);
                      setPaymentData({
                        ...paymentData,
                        orderId: e.target.value,
                        billNumber: selectedBill?.bill_number || ''
                      });
                    }}
                    required={paymentData.paymentType === 'order_payment'}
                    style={{ padding: '0.75rem', fontSize: '1rem' }}
                  >
                    <option value="">-- Select Bill --</option>
                    {unpaidBills.map(bill => (
                      <option key={bill.id} value={bill.id}>
                        {bill.bill_number || `Order ${new Date(bill.order_date).toLocaleDateString()}`} -
                        Total: ₹{parseFloat(bill.total_amount).toFixed(2)} |
                        Paid: ₹{parseFloat(bill.paid_amount).toFixed(2)} |
                        Remaining: ₹{parseFloat(bill.remaining_amount).toFixed(2)}
                      </option>
                    ))}
                  </select>
                  {unpaidBills.length === 0 && (
                    <small style={{ color: '#856404', fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>
                      No bills found for this distributor
                    </small>
                  )}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="amount">Amount</label>
                <input
                  type="number"
                  id="amount"
                  className="form-control"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  step="0.01"
                  min="0"
                  required
                  placeholder="Enter amount"
                  style={{ padding: '0.75rem', fontSize: '1rem' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="paymentFrom">Payment From | से भुगतान</label>
                <select
                  id="paymentFrom"
                  className="form-control"
                  value={paymentData.paymentFrom}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentFrom: e.target.value })}
                  required
                  style={{ padding: '0.75rem', fontSize: '1rem' }}
                >
                  <option value="bank_balance">Bank Balance | बैंक शेष</option>
                  <option value="cash_balance">Cash Balance | नकद शेष</option>
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

              <div className="form-group">
                <label htmlFor="notes">Notes (Optional)</label>
                <textarea
                  id="notes"
                  className="form-control"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder="Add any notes about this payment"
                  rows="2"
                  style={{ padding: '0.75rem', fontSize: '1rem' }}
                />
              </div>

              {paymentData.distributorId && paymentData.amount && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  border: '1px solid #2196F3'
                }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#1565c0' }}>New Outstanding After Payment</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#0d47a1' }}>
                    ₹{(parseFloat(distributors.find(d => d.id === paymentData.distributorId)?.amount_outstanding || 0) - parseFloat(paymentData.amount || 0)).toFixed(2)}
                  </p>
                  {paymentData.paymentType === 'advance' && (parseFloat(distributors.find(d => d.id === paymentData.distributorId)?.amount_outstanding || 0) - parseFloat(paymentData.amount || 0)) < 0 && (
                    <small style={{ color: '#0d47a1', fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>
                      ✓ Negative balance represents advance/credit with distributor
                    </small>
                  )}
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', width: '95%', maxHeight: '90vh', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Distributor Details - {selectedDistributor.name}</h2>
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

            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              borderBottom: '2px solid #dee2e6',
              marginBottom: '1.5rem',
              overflowX: 'auto',
              flexShrink: 0
            }}>
              <button
                onClick={() => setActiveTab('outstanding')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderBottom: activeTab === 'outstanding' ? '3px solid #2196F3' : '3px solid transparent',
                  background: activeTab === 'outstanding' ? '#e3f2fd' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'outstanding' ? '700' : '600',
                  color: activeTab === 'outstanding' ? '#0d47a1' : '#666',
                  fontSize: '1rem',
                  whiteSpace: 'nowrap'
                }}
              >
                Outstanding Bills ({unpaidBills.filter(b => !b.is_fully_paid).length})
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderBottom: activeTab === 'payments' ? '3px solid #2196F3' : '3px solid transparent',
                  background: activeTab === 'payments' ? '#e3f2fd' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'payments' ? '700' : '600',
                  color: activeTab === 'payments' ? '#0d47a1' : '#666',
                  fontSize: '1rem',
                  whiteSpace: 'nowrap'
                }}
              >
                Payment History ({distributorHistory.length})
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderBottom: activeTab === 'orders' ? '3px solid #2196F3' : '3px solid transparent',
                  background: activeTab === 'orders' ? '#e3f2fd' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'orders' ? '700' : '600',
                  color: activeTab === 'orders' ? '#0d47a1' : '#666',
                  fontSize: '1rem',
                  whiteSpace: 'nowrap'
                }}
              >
                All Orders ({distributorOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('ledger')}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderBottom: activeTab === 'ledger' ? '3px solid #2196F3' : '3px solid transparent',
                  background: activeTab === 'ledger' ? '#e3f2fd' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'ledger' ? '700' : '600',
                  color: activeTab === 'ledger' ? '#0d47a1' : '#666',
                  fontSize: '1rem',
                  whiteSpace: 'nowrap'
                }}
              >
                Complete Ledger ({distributorLedger.length})
              </button>
            </div>

            {/* Tab Content - Scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

            {/* Outstanding Bills Tab */}
            {activeTab === 'outstanding' && (
            <div>
            {unpaidBills.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#666',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid #dee2e6'
              }}>
                <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: '#666' }}>
                  No bills found for this distributor
                </p>
              </div>
            ) : unpaidBills.filter(b => !b.is_fully_paid).length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#666',
                backgroundColor: '#d4edda',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid #c3e6cb'
              }}>
                <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: '#155724' }}>
                  ✓ All bills are fully paid!
                </p>
              </div>
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Bill Number</th>
                      <th>Order Date</th>
                      <th>Total Amount</th>
                      <th>Paid</th>
                      <th>Remaining</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unpaidBills
                      .filter(b => !b.is_fully_paid)
                      .map(bill => (
                        <tr key={bill.id}>
                          <td style={{ fontWeight: '600' }}>
                            {bill.bill_number || '-'}
                          </td>
                          <td>{new Date(bill.order_date).toLocaleDateString()}</td>
                          <td>₹{parseFloat(bill.total_amount).toFixed(2)}</td>
                          <td style={{ color: '#2196F3', fontWeight: '600' }}>
                            ₹{parseFloat(bill.paid_amount).toFixed(2)}
                          </td>
                          <td style={{ color: '#dc3545', fontWeight: '700', fontSize: '1.125rem' }}>
                            ₹{parseFloat(bill.remaining_amount).toFixed(2)}
                          </td>
                          <td>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              backgroundColor: parseFloat(bill.paid_amount) > 0 ? '#fff3cd' : '#f8d7da',
                              color: parseFloat(bill.paid_amount) > 0 ? '#856404' : '#721c24'
                            }}>
                              {parseFloat(bill.paid_amount) > 0 ? 'Partial' : 'Unpaid'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot style={{ borderTop: '2px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
                    <tr>
                      <td colSpan="4" style={{ fontWeight: '700', textAlign: 'right', paddingTop: '1rem' }}>
                        Total Outstanding:
                      </td>
                      <td colSpan="2" style={{ fontWeight: '700', fontSize: '1.25rem', color: '#dc3545', paddingTop: '1rem' }}>
                        ₹{unpaidBills
                          .filter(b => !b.is_fully_paid)
                          .reduce((sum, bill) => sum + parseFloat(bill.remaining_amount), 0)
                          .toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            </div>
            )}

            {/* Payment History Tab */}
            {activeTab === 'payments' && (
            <div>
            {distributorHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                No payment history found for this distributor
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="table">
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Bill Number</th>
                      <th>Amount</th>
                      <th>Paid From</th>
                      <th>Notes</th>
                      <th>Paid By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributorHistory.map(record => {
                      const paidFromDisplay = record.payment_from === 'cash_balance' ? 'Cash' :
                        record.payment_from === 'bank_balance' ? 'Bank' :
                        record.payment_from === 'gala_balance' ? 'Gala' : '-';

                      const paymentTypeDisplay = record.payment_type === 'advance' ? 'Advance' : 'Order Payment';

                      return (
                        <tr key={record.id}>
                          <td>{new Date(record.payment_date).toLocaleDateString()}</td>
                          <td>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              backgroundColor: record.payment_type === 'advance' ? '#e3f2fd' : '#fff3cd',
                              color: record.payment_type === 'advance' ? '#0d47a1' : '#856404'
                            }}>
                              {paymentTypeDisplay}
                            </span>
                          </td>
                          <td style={{ fontWeight: '600' }}>
                            {record.bill_number || (record.order_date ? new Date(record.order_date).toLocaleDateString() : '-')}
                          </td>
                          <td style={{ color: '#2196F3', fontWeight: '700', fontSize: '1.125rem' }}>
                            ₹{parseFloat(record.amount).toFixed(2)}
                          </td>
                          <td>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              backgroundColor: record.payment_from === 'cash_balance' ? '#fff3cd' :
                                record.payment_from === 'bank_balance' ? '#d1ecf1' :
                                record.payment_from === 'gala_balance' ? '#d4edda' : '#f8f9fa',
                              color: '#000',
                              fontWeight: '600'
                            }}>
                              {paidFromDisplay}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.875rem', color: '#666' }}>
                            {record.notes || '-'}
                          </td>
                          <td>{record.created_by_name || '-'}</td>
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
                  ₹{distributorHistory.reduce((sum, record) => sum + parseFloat(record.amount || 0), 0).toFixed(2)}
                </p>
              </div>
            )}
            </div>
            )}

            {/* All Orders Tab */}
            {activeTab === 'orders' && (
            <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              All Orders ({distributorOrders.length})
            </h3>

            {distributorOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '1.5rem' }}>
                No orders found for this distributor
              </div>
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order Date</th>
                      <th>Bill Number</th>
                      <th>Items</th>
                      <th>Total Amount</th>
                      <th>Payment Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributorOrders.map(order => {
                      const itemsTotal = order.order_data && Array.isArray(order.order_data)
                        ? order.order_data.reduce((sum, item) => sum + parseFloat(item.total || 0), 0)
                        : 0;
                      const grandTotal = itemsTotal + parseFloat(order.tax || 0) + parseFloat(order.misc || 0) - parseFloat(order.scheme || 0) - parseFloat(order.discount || 0);

                      return (
                        <tr key={order.id}>
                          <td>{new Date(order.order_date).toLocaleDateString()}</td>
                          <td style={{ fontWeight: '600' }}>
                            {order.bill_number || '-'}
                          </td>
                          <td>
                            {order.order_data && Array.isArray(order.order_data) ? order.order_data.length : 0} items
                          </td>
                          <td style={{ fontWeight: '700', fontSize: '1.125rem', color: '#2e7d32' }}>
                            ₹{grandTotal.toFixed(2)}
                          </td>
                          <td>
                            {order.payment_outstanding_date
                              ? new Date(order.payment_outstanding_date).toLocaleDateString()
                              : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot style={{ borderTop: '2px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
                    <tr>
                      <td colSpan="3" style={{ fontWeight: '700', textAlign: 'right', paddingTop: '1rem' }}>
                        Total Orders Value:
                      </td>
                      <td colSpan="2" style={{ fontWeight: '700', fontSize: '1.25rem', color: '#2e7d32', paddingTop: '1rem' }}>
                        ₹{distributorOrders.reduce((sum, order) => {
                          const itemsTotal = order.order_data && Array.isArray(order.order_data)
                            ? order.order_data.reduce((s, item) => s + parseFloat(item.total || 0), 0)
                            : 0;
                          return sum + itemsTotal + parseFloat(order.tax || 0) + parseFloat(order.misc || 0) - parseFloat(order.scheme || 0) - parseFloat(order.discount || 0);
                        }, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            </div>
            )}

            {/* Complete Ledger Tab */}
            {activeTab === 'ledger' && (
            <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              Complete Ledger ({distributorLedger.length} transactions)
            </h3>

            {distributorLedger.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '1.5rem' }}>
                No transactions found for this distributor
              </div>
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Bill Number</th>
                      <th>Debit (Orders)</th>
                      <th>Credit (Payments)</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributorLedger.map((transaction, index) => {
                      const isOrder = transaction.transaction_type === 'order';
                      const typeDisplay = isOrder ? 'Order' :
                        transaction.transaction_type === 'advance' ? 'Advance Payment' : 'Order Payment';

                      return (
                        <tr key={index} style={{ backgroundColor: isOrder ? '#fff3e0' : '#e8f5e9' }}>
                          <td>{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                          <td>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              backgroundColor: isOrder ? '#ff9800' : '#4caf50',
                              color: '#fff'
                            }}>
                              {typeDisplay}
                            </span>
                          </td>
                          <td style={{ fontWeight: '600' }}>
                            {transaction.bill_number || '-'}
                          </td>
                          <td style={{ color: '#d32f2f', fontWeight: '700', fontSize: '1.125rem' }}>
                            {parseFloat(transaction.debit_amount) > 0 ? `₹${parseFloat(transaction.debit_amount).toFixed(2)}` : '-'}
                          </td>
                          <td style={{ color: '#2e7d32', fontWeight: '700', fontSize: '1.125rem' }}>
                            {parseFloat(transaction.credit_amount) > 0 ? `₹${parseFloat(transaction.credit_amount).toFixed(2)}` : '-'}
                          </td>
                          <td style={{ fontSize: '0.875rem', color: '#666' }}>
                            {transaction.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot style={{ borderTop: '2px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
                    <tr>
                      <td colSpan="3" style={{ fontWeight: '700', textAlign: 'right', paddingTop: '1rem' }}>
                        Totals:
                      </td>
                      <td style={{ fontWeight: '700', fontSize: '1.25rem', color: '#d32f2f', paddingTop: '1rem' }}>
                        ₹{distributorLedger.reduce((sum, t) => sum + parseFloat(t.debit_amount || 0), 0).toFixed(2)}
                      </td>
                      <td style={{ fontWeight: '700', fontSize: '1.25rem', color: '#2e7d32', paddingTop: '1rem' }}>
                        ₹{distributorLedger.reduce((sum, t) => sum + parseFloat(t.credit_amount || 0), 0).toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                    <tr style={{ backgroundColor: '#e3f2fd' }}>
                      <td colSpan="3" style={{ fontWeight: '700', textAlign: 'right', paddingTop: '1rem' }}>
                        Net Outstanding:
                      </td>
                      <td colSpan="3" style={{ fontWeight: '700', fontSize: '1.5rem', color: '#0d47a1', paddingTop: '1rem' }}>
                        ₹{(
                          distributorLedger.reduce((sum, t) => sum + parseFloat(t.debit_amount || 0), 0) -
                          distributorLedger.reduce((sum, t) => sum + parseFloat(t.credit_amount || 0), 0)
                        ).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            </div>
            )}

            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DistributorsTab;
