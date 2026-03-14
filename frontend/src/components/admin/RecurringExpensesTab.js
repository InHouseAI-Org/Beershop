import { useState, useEffect } from 'react';
import api from '../../utils/api';
import MobileTable from '../common/MobileTable';

const RecurringExpensesTab = () => {
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [formData, setFormData] = useState({
    expenseName: '',
    recurrenceType: 'monthly',
    recurrenceFrequency: '1',
    expenseAmount: '',
    nextDueDate: '',
    notes: ''
  });
  const [paymentData, setPaymentData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paidFrom: 'cash_balance',
    amount: '',
    notes: ''
  });

  useEffect(() => {
    fetchRecurringExpenses();
  }, []);

  const fetchRecurringExpenses = async () => {
    try {
      const response = await api.get('/recurring-expenses');
      setRecurringExpenses(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch recurring expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        expenseName: expense.expense_name,
        recurrenceType: expense.recurrence_type,
        recurrenceFrequency: expense.recurrence_frequency.toString(),
        expenseAmount: expense.expense_amount,
        nextDueDate: expense.next_due_date || '',
        notes: expense.notes || ''
      });
    } else {
      setEditingExpense(null);
      setFormData({
        expenseName: '',
        recurrenceType: 'monthly',
        recurrenceFrequency: '1',
        expenseAmount: '',
        nextDueDate: '',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExpense(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const requestData = {
        expenseName: formData.expenseName,
        recurrenceType: formData.recurrenceType,
        recurrenceFrequency: parseInt(formData.recurrenceFrequency),
        expenseAmount: parseFloat(formData.expenseAmount),
        nextDueDate: formData.nextDueDate || null,
        notes: formData.notes
      };

      if (editingExpense) {
        await api.put(`/recurring-expenses/${editingExpense.id}`, requestData);
        setSuccess('Recurring expense updated successfully');
      } else {
        await api.post('/recurring-expenses', requestData);
        setSuccess('Recurring expense created successfully');
      }

      await fetchRecurringExpenses();
      handleCloseModal();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleOpenPayModal = (expense) => {
    setSelectedExpense(expense);
    setPaymentData({
      paymentDate: new Date().toISOString().split('T')[0],
      paidFrom: 'cash_balance',
      amount: expense.expense_amount.toString(),
      notes: ''
    });
    setShowPayModal(true);
  };

  const handleClosePayModal = () => {
    setShowPayModal(false);
    setSelectedExpense(null);
  };

  const handlePayExpense = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const requestData = {
        paymentDate: paymentData.paymentDate,
        paidFrom: paymentData.paidFrom,
        amount: parseFloat(paymentData.amount),
        notes: paymentData.notes
      };

      await api.post(`/recurring-expenses/${selectedExpense.id}/pay`, requestData);

      setSuccess(`Payment of ₹${paymentData.amount} recorded successfully`);
      await fetchRecurringExpenses();
      handleClosePayModal();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed');
    }
  };

  const handleViewHistory = async (expense) => {
    try {
      const response = await api.get(`/recurring-expenses/${expense.id}/payments`);
      setPaymentHistory(response.data);
      setSelectedExpense(expense);
      setShowHistoryModal(true);
    } catch (err) {
      setError('Failed to fetch payment history');
    }
  };

  const handleToggleActive = async (expense) => {
    try {
      await api.put(`/recurring-expenses/${expense.id}`, {
        isActive: !expense.is_active
      });
      setSuccess(`Recurring expense ${!expense.is_active ? 'activated' : 'deactivated'}`);
      await fetchRecurringExpenses();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const getDueStatusBadge = (expense) => {
    if (!expense.is_active) {
      return {
        text: 'Inactive',
        color: '#6c757d',
        bgColor: '#e2e3e5'
      };
    }

    switch (expense.due_status) {
      case 'overdue':
        return {
          text: 'Overdue',
          color: '#dc3545',
          bgColor: '#f8d7da'
        };
      case 'due_today':
        return {
          text: 'Due Today',
          color: '#ffc107',
          bgColor: '#fff3cd'
        };
      case 'due_soon':
        return {
          text: 'Due Soon',
          color: '#17a2b8',
          bgColor: '#d1ecf1'
        };
      default:
        return {
          text: 'Upcoming',
          color: '#28a745',
          bgColor: '#d4edda'
        };
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const columns = [
    { key: 'expense_name', label: 'Expense Name' },
    {
      key: 'recurrence',
      label: 'Recurrence',
      render: (expense) => (
        <span>
          Every {expense.recurrence_frequency} {expense.recurrence_type}
          {expense.recurrence_frequency > 1 ? 's' : ''}
        </span>
      )
    },
    {
      key: 'expense_amount',
      label: 'Amount',
      render: (expense) => (
        <span style={{ fontWeight: '700', color: '#dc3545' }}>
          ₹{parseFloat(expense.expense_amount || 0).toFixed(2)}
        </span>
      )
    },
    {
      key: 'next_due_date',
      label: 'Next Due',
      render: (expense) => expense.next_due_date ? new Date(expense.next_due_date).toLocaleDateString() : 'Not set'
    },
    {
      key: 'status',
      label: 'Status',
      render: (expense) => {
        const badge = getDueStatusBadge(expense);
        return (
          <span style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: '600',
            backgroundColor: badge.bgColor,
            color: badge.color
          }}>
            {badge.text}
            {expense.is_active && expense.days_until_due !== null && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                ({expense.days_until_due > 0 ? `in ${expense.days_until_due}d` : `${Math.abs(expense.days_until_due)}d ago`})
              </span>
            )}
          </span>
        );
      }
    },
    {
      key: 'total_payments',
      label: 'Payments',
      render: (expense) => (
        <span>
          {expense.total_payments || 0}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (expense) => (
        <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {expense.is_active && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenPayModal(expense);
              }}
              className="btn btn-success"
              style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
            >
              Pay
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewHistory(expense);
            }}
            className="btn btn-primary"
            style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
          >
            History
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenModal(expense);
            }}
            className="btn btn-secondary"
            style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleActive(expense);
            }}
            className="btn"
            style={{
              fontSize: '0.875rem',
              padding: '0.375rem 0.75rem',
              background: expense.is_active ? '#6c757d' : '#28a745',
              color: '#fff'
            }}
          >
            {expense.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      {success && <div className="success" style={{ marginBottom: '1rem' }}>{success}</div>}
      {error && !showModal && !showPayModal && (
        <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>
      )}

      <div className="mobile-stack" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
        <h2 style={{ color: '#000', margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: '700', letterSpacing: '0.5px' }}>
          Recurring Expenses
        </h2>
        <button onClick={() => handleOpenModal()} className="btn btn-success">
          Add Recurring Expense
        </button>
      </div>

      <MobileTable
        columns={columns}
        data={recurringExpenses}
        onRowClick={handleViewHistory}
        enableSearch={true}
        enableSort={true}
        defaultSortKey="next_due_date"
        defaultSortOrder="asc"
      />

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%' }}>
            <h2>{editingExpense ? 'Edit Recurring Expense' : 'Add Recurring Expense'}</h2>
            {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="expenseName">Expense Name *</label>
                <input
                  type="text"
                  id="expenseName"
                  className="form-control"
                  value={formData.expenseName}
                  onChange={(e) => setFormData({ ...formData, expenseName: e.target.value })}
                  required
                  placeholder="e.g., Rent, Insurance, Subscription"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="recurrenceType">Recurrence Type *</label>
                  <select
                    id="recurrenceType"
                    className="form-control"
                    value={formData.recurrenceType}
                    onChange={(e) => setFormData({ ...formData, recurrenceType: e.target.value })}
                    required
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="recurrenceFrequency">Every *</label>
                  <input
                    type="number"
                    id="recurrenceFrequency"
                    className="form-control"
                    value={formData.recurrenceFrequency}
                    onChange={(e) => setFormData({ ...formData, recurrenceFrequency: e.target.value })}
                    min="1"
                    max="100"
                    required
                    placeholder="1"
                  />
                  <small style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    (e.g., 2 for bi-weekly)
                  </small>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="expenseAmount">Amount (₹) *</label>
                  <input
                    type="number"
                    id="expenseAmount"
                    className="form-control"
                    value={formData.expenseAmount}
                    onChange={(e) => setFormData({ ...formData, expenseAmount: e.target.value })}
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="nextDueDate">Next Due Date (Optional)</label>
                  <input
                    type="date"
                    id="nextDueDate"
                    className="form-control"
                    value={formData.nextDueDate}
                    onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes (Optional)</label>
                <textarea
                  id="notes"
                  className="form-control"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  placeholder="Additional notes about this recurring expense"
                />
              </div>

              <div className="modal-buttons">
                <button type="submit" className="btn btn-primary">
                  {editingExpense ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Expense Modal */}
      {showPayModal && selectedExpense && (
        <div className="modal-overlay" onClick={handleClosePayModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
            <h2>Pay Recurring Expense</h2>
            {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <div style={{
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #dee2e6'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>{selectedExpense.expense_name}</h3>
              <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: '#666' }}>
                Recurs every {selectedExpense.recurrence_frequency} {selectedExpense.recurrence_type}
                {selectedExpense.recurrence_frequency > 1 ? 's' : ''}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.25rem', fontWeight: '700', color: '#dc3545' }}>
                Amount: ₹{parseFloat(selectedExpense.expense_amount).toFixed(2)}
              </p>
            </div>

            <form onSubmit={handlePayExpense}>
              <div className="form-group">
                <label htmlFor="paymentDate">Payment Date *</label>
                <input
                  type="date"
                  id="paymentDate"
                  className="form-control"
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="amount">Amount (₹) *</label>
                <input
                  type="number"
                  id="amount"
                  className="form-control"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  step="0.01"
                  min="0"
                  required
                />
                <small style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>
                  Default is the recurring amount, you can change if needed
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="paidFrom">Pay From *</label>
                <select
                  id="paidFrom"
                  className="form-control"
                  value={paymentData.paidFrom}
                  onChange={(e) => setPaymentData({ ...paymentData, paidFrom: e.target.value })}
                  required
                >
                  <option value="cash_balance">Cash Balance</option>
                  <option value="bank_balance">Bank Balance</option>
                  <option value="gala_balance">Gala Balance</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="paymentNotes">Notes (Optional)</label>
                <textarea
                  id="paymentNotes"
                  className="form-control"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  rows="2"
                  placeholder="Additional notes for this payment"
                />
              </div>

              <div className="modal-buttons">
                <button type="submit" className="btn btn-success">
                  Pay ₹{paymentData.amount}
                </button>
                <button type="button" onClick={handleClosePayModal} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showHistoryModal && selectedExpense && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Payment History</h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Close
              </button>
            </div>

            <div style={{
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #dee2e6'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>{selectedExpense.expense_name}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Total Payments</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.125rem', fontWeight: '700' }}>
                    {selectedExpense.total_payments || 0}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Total Paid</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.125rem', fontWeight: '700', color: '#dc3545' }}>
                    ₹{parseFloat(selectedExpense.total_paid || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Last Payment</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.125rem', fontWeight: '700' }}>
                    {selectedExpense.last_payment_date ? new Date(selectedExpense.last_payment_date).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            {paymentHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                No payments recorded yet
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="table">
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Paid From</th>
                      <th>Notes</th>
                      <th>Paid By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map(payment => (
                      <tr key={payment.id}>
                        <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                        <td style={{ fontWeight: '700', color: '#dc3545' }}>
                          ₹{parseFloat(payment.amount).toFixed(2)}
                        </td>
                        <td>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            backgroundColor: payment.paid_from === 'cash_balance' ? '#fff3cd' :
                              payment.paid_from === 'bank_balance' ? '#d1ecf1' :
                              payment.paid_from === 'gala_balance' ? '#d4edda' : '#f8f9fa',
                            color: '#000',
                            fontWeight: '600'
                          }}>
                            {payment.paid_from === 'cash_balance' ? 'Cash' :
                             payment.paid_from === 'bank_balance' ? 'Bank' : 'Gala'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.875rem' }}>{payment.notes || '-'}</td>
                        <td>{payment.created_by_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default RecurringExpensesTab;
