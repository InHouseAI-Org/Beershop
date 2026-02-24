import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';
import api from '../utils/api';

const SuperAdminDashboard = () => {
  const { user, logout } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    organisationName: '',
    email: '',
    initialCashBalance: '',
    initialBankBalance: '',
    initialGalaBalance: ''
  });

  useEffect(() => {
    fetchAdmins();

    // Check if user is on mobile device
    const isMobile = window.innerWidth < 768;
    const hasSeenWarning = sessionStorage.getItem('superAdminMobileWarningDismissed');

    if (isMobile && !hasSeenWarning) {
      setShowMobileWarning(true);
    }
  }, []);

  const dismissWarning = () => {
    sessionStorage.setItem('superAdminMobileWarningDismissed', 'true');
    setShowMobileWarning(false);
  };

  const fetchAdmins = async () => {
    try {
      const response = await api.get('/admins');
      setAdmins(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch admins');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (admin = null) => {
    if (admin) {
      setEditingAdmin(admin);
      setFormData({
        username: admin.username,
        password: '',
        organisationName: admin.organisationName || '',
        email: admin.email || '',
        initialCashBalance: '',
        initialBankBalance: '',
        initialGalaBalance: ''
      });
    } else {
      setEditingAdmin(null);
      setFormData({
        username: '',
        password: '',
        organisationName: '',
        email: '',
        initialCashBalance: '',
        initialBankBalance: '',
        initialGalaBalance: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAdmin(null);
    setFormData({
      username: '',
      password: '',
      organisationName: '',
      email: '',
      initialCashBalance: '',
      initialBankBalance: '',
      initialGalaBalance: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingAdmin) {
        // Update admin
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password; // Don't update password if not provided
        }
        await api.put(`/admins/${editingAdmin.id}`, updateData);
      } else {
        // Create admin
        await api.post('/admins', formData);
      }
      await fetchAdmins();
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin? All associated users will also be deleted.')) {
      return;
    }

    try {
      await api.delete(`/admins/${id}`);
      await fetchAdmins();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete admin');
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <>
      {/* Mobile Device Warning */}
      {showMobileWarning && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
              border: '3px solid #ff9800',
              animation: 'modalSlideIn 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                backgroundColor: '#fff3e0',
                borderRadius: '50%',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={48} style={{ color: '#ff9800' }} />
              </div>
            </div>

            <h2 style={{
              textAlign: 'center',
              marginBottom: '1rem',
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#000'
            }}>
              Mobile Device Detected
            </h2>

            <p style={{
              textAlign: 'center',
              marginBottom: '0.5rem',
              fontSize: '1rem',
              color: '#666',
              lineHeight: '1.6'
            }}>
              For the best experience with the Super Admin Panel, we recommend using a <strong style={{ color: '#000' }}>tablet or desktop computer</strong>.
            </p>

            <p style={{
              textAlign: 'center',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              color: '#999',
              lineHeight: '1.6'
            }}>
              The admin interface contains many features and data tables that work better on larger screens.
            </p>

            <button
              onClick={dismissWarning}
              className="btn btn-primary"
              style={{
                width: '100%',
                fontSize: '1.125rem',
                padding: '1rem',
                backgroundColor: '#ff9800',
                borderColor: '#ff9800',
                fontWeight: '700'
              }}
            >
              I Understand, Continue
            </button>

            <p style={{
              textAlign: 'center',
              marginTop: '1rem',
              fontSize: '0.75rem',
              color: '#999'
            }}>
              This message will not appear again in this session
            </p>
          </div>
        </div>
      )}

      <div className="header">
        <div className="header-content">
          <div>
            <h1>Super Admin Dashboard</h1>
            <p style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Welcome, {user?.username}
            </p>
          </div>
          <button onClick={logout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>

      <div className="container">
        {error && <div className="error" style={{ marginBottom: '1rem', fontSize: '1rem' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ color: '#000', margin: 0, fontSize: '2rem', fontWeight: '700', letterSpacing: '0.5px' }}>Manage Admins</h2>
          <button onClick={() => handleOpenModal()} className="btn btn-success">
            Add New Admin
          </button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Organization</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                    No admins found. Create your first admin!
                  </td>
                </tr>
              ) : (
                admins.map(admin => (
                  <tr key={admin.id}>
                    <td>{admin.username}</td>
                    <td>{admin.organisationName}</td>
                    <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleOpenModal(admin)}
                          className="btn btn-primary"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(admin.id)}
                          className="btn btn-danger"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingAdmin ? 'Edit Admin' : 'Add New Admin'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  className="form-control"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Password {editingAdmin && '(leave blank to keep current)'}
                </label>
                <input
                  type="password"
                  id="password"
                  className="form-control"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingAdmin}
                />
              </div>

              <div className="form-group">
                <label htmlFor="organisationName">Organisation Name</label>
                <input
                  type="text"
                  id="organisationName"
                  className="form-control"
                  value={formData.organisationName}
                  onChange={(e) => setFormData({ ...formData, organisationName: e.target.value })}
                  required={!editingAdmin}
                  disabled={editingAdmin}
                  placeholder={editingAdmin ? 'Organisation cannot be changed' : 'Enter organisation name'}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email (optional)</label>
                <input
                  type="email"
                  id="email"
                  className="form-control"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.com"
                />
              </div>

              {!editingAdmin && (
                <>
                  <div style={{
                    marginTop: '1.5rem',
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#e8f5e9',
                    borderRadius: '8px',
                    border: '1px solid #4caf50'
                  }}>
                    <strong style={{ color: '#2e7d32', fontSize: '0.95rem' }}>
                      Initial Balances (शुरुआती शेष राशि)
                    </strong>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#555' }}>
                      Set opening balances for this organisation
                    </p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="initialCashBalance">
                      Initial Cash Balance / प्रारंभिक नकद शेष (₹)
                    </label>
                    <input
                      type="number"
                      id="initialCashBalance"
                      className="form-control"
                      value={formData.initialCashBalance}
                      onChange={(e) => setFormData({ ...formData, initialCashBalance: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="initialBankBalance">
                      Initial Bank Balance / प्रारंभिक बैंक शेष (₹)
                    </label>
                    <input
                      type="number"
                      id="initialBankBalance"
                      className="form-control"
                      value={formData.initialBankBalance}
                      onChange={(e) => setFormData({ ...formData, initialBankBalance: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="initialGalaBalance">
                      Initial Gala Balance / प्रारंभिक गाला शेष (₹)
                    </label>
                    <input
                      type="number"
                      id="initialGalaBalance"
                      className="form-control"
                      value={formData.initialGalaBalance}
                      onChange={(e) => setFormData({ ...formData, initialGalaBalance: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </>
              )}

              <div className="modal-buttons">
                <button type="submit" className="btn btn-primary">
                  {editingAdmin ? 'Update' : 'Create'}
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

export default SuperAdminDashboard;
