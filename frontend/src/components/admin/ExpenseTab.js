import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Edit2, Trash2, AlertCircle, Receipt, Calendar } from 'lucide-react';

const ExpenseTab = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    expenseName: '',
    description: '',
    expenseFrom: 'cash_balance',
    expenseAmount: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/expenses');
      setExpenses(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError(err.response?.data?.error || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        expenseName: expense.expense_name,
        description: expense.description || '',
        expenseFrom: expense.expense_from,
        expenseAmount: expense.expense_amount,
        date: expense.date.split('T')[0]
      });
    } else {
      setEditingExpense(null);
      setFormData({
        expenseName: '',
        description: '',
        expenseFrom: 'cash_balance',
        expenseAmount: '',
        date: new Date().toISOString().split('T')[0]
      });
    }
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExpense(null);
    setFormData({
      expenseName: '',
      description: '',
      expenseFrom: 'cash_balance',
      expenseAmount: '',
      date: new Date().toISOString().split('T')[0]
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.expenseName || !formData.expenseAmount || !formData.date) {
      setError('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.expenseAmount) <= 0) {
      setError('Expense amount must be greater than 0');
      return;
    }

    try {
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, formData);
      } else {
        await api.post('/expenses', formData);
      }

      await fetchExpenses();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving expense:', err);
      setError(err.response?.data?.error || 'Failed to save expense');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense? / क्या आप सुनिश्चित हैं?')) {
      return;
    }

    try {
      await api.delete(`/expenses/${id}`);
      await fetchExpenses();
    } catch (err) {
      console.error('Error deleting expense:', err);
      setError(err.response?.data?.error || 'Failed to delete expense');
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

  const getBalanceSourceLabel = (source) => {
    const labels = {
      cash_balance: 'Cash / नकद',
      bank_balance: 'Bank / बैंक',
      gala_balance: 'Gala / गला'
    };
    return labels[source] || source;
  };

  const getBalanceSourceColor = (source) => {
    const colors = {
      cash_balance: '#667eea',
      bank_balance: '#f5576c',
      gala_balance: '#00f2fe'
    };
    return colors[source] || '#000';
  };

  if (loading) {
    return <div className="loading">Loading expenses...</div>;
  }

  return (
    <div className="expense-tab">
      {error && !showModal && (
        <div className="error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} style={{ marginRight: '0.5rem' }} />
          {error}
        </div>
      )}

      {/* Header */}
      <div className="header" style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background : 'transparent', border: 'none', padding: '0'}}>
        <h2 style={{ fontSize: '1.5rem', color: '#000', fontWeight: '700'}}>
          Expenses
        </h2>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          Add Expense
        </button>
      </div>

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Receipt size={48} style={{ color: '#ccc', margin: '0 auto 1rem' }} />
          <p style={{ color: '#666' }}>
            No expenses recorded yet
          </p>
          <button
            className="btn btn-primary"
            onClick={() => handleOpenModal()}
            style={{ marginTop: '1rem' }}
          >
            <Plus size={20} style={{ marginRight: '0.5rem' }} />
            Add Your First Expense
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="desktop-only">
            <table className="table">
              <thead>
                <tr>
                  <th>Date / तारीख</th>
                  <th>Expense Name / व्यय का नाम</th>
                  <th>Description / विवरण</th>
                  <th>Source / स्रोत</th>
                  <th>Amount / राशि</th>
                  <th>Actions / क्रियाएं</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{formatDate(expense.date)}</td>
                    <td style={{ fontWeight: '600' }}>{expense.expense_name}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {expense.description || '-'}
                    </td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: getBalanceSourceColor(expense.expense_from) + '20',
                        color: getBalanceSourceColor(expense.expense_from),
                        border: `1px solid ${getBalanceSourceColor(expense.expense_from)}`
                      }}>
                        {getBalanceSourceLabel(expense.expense_from)}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700', color: '#dc3545' }}>
                      {formatCurrency(expense.expense_amount)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                          onClick={() => handleOpenModal(expense)}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                          onClick={() => handleDelete(expense.id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="mobile-only">
            {expenses.map((expense) => (
              <div key={expense.id} className="card" style={{ marginBottom: '1rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.75rem'
                }}>
                  <div>
                    <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      {expense.expense_name}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      <Calendar size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      {formatDate(expense.date)}
                    </div>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#dc3545' }}>
                    {formatCurrency(expense.expense_amount)}
                  </div>
                </div>

                {expense.description && (
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#666',
                    marginBottom: '0.75rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid #eee'
                  }}>
                    {expense.description}
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: getBalanceSourceColor(expense.expense_from) + '20',
                    color: getBalanceSourceColor(expense.expense_from),
                    border: `1px solid ${getBalanceSourceColor(expense.expense_from)}`
                  }}>
                    Source: {getBalanceSourceLabel(expense.expense_from)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleOpenModal(expense)}
                    style={{ flex: 1 }}
                  >
                    <Edit2 size={16} style={{ marginRight: '0.5rem' }} />
                    Edit / संपादित करें
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(expense.id)}
                    style={{ flex: 1 }}
                  >
                    <Trash2 size={16} style={{ marginRight: '0.5rem' }} />
                    Delete / हटाएं
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Expense Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1.5rem' }}>
              {editingExpense ? 'Edit Expense / व्यय संपादित करें' : 'Add Expense / व्यय जोड़ें'}
            </h3>

            {error && (
              <div className="error" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={16} style={{ marginRight: '0.5rem' }} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>
                  Expense Name / व्यय का नाम <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.expenseName}
                  onChange={(e) => setFormData({ ...formData, expenseName: e.target.value })}
                  placeholder="e.g., Rent, Electricity, Salaries"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description / विवरण</label>
                <textarea
                  className="form-control"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional details about the expense"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>
                  Expense From / व्यय का स्रोत <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={formData.expenseFrom}
                  onChange={(e) => setFormData({ ...formData, expenseFrom: e.target.value })}
                  required
                >
                  <option value="cash_balance">Cash Balance / नकद शेष</option>
                  <option value="bank_balance">Bank Balance / बैंक शेष</option>
                  <option value="gala_balance">Gala Balance / गला शेष</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  Amount / राशि (₹) <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.expenseAmount}
                  onChange={(e) => setFormData({ ...formData, expenseAmount: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Date / तारीख <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingExpense ? 'Update / अपडेट करें' : 'Add / जोड़ें'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                  style={{ flex: 1 }}
                >
                  Cancel / रद्द करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTab;
