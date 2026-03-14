import { useState, useEffect } from 'react';
import api from '../../utils/api';
import MobileTable from '../common/MobileTable';

const SchemesTab = () => {
  const [schemes, setSchemes] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [schemeProgress, setSchemeProgress] = useState(null);
  const [formData, setFormData] = useState({
    distributorId: '',
    schemeName: '',
    schemeStartDate: '',
    schemePeriodValue: '',
    schemePeriodUnit: 'months',
    schemeTargetQty: '',
    targetType: 'overall',
    schemeProducts: [],
    schemeValue: '',
    notes: ''
  });

  useEffect(() => {
    fetchSchemes();
    fetchDistributors();
    fetchProducts();
  }, []);

  const fetchSchemes = async () => {
    try {
      const response = await api.get('/schemes');
      setSchemes(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch schemes');
    } finally {
      setLoading(false);
    }
  };

  const fetchDistributors = async () => {
    try {
      const response = await api.get('/distributors');
      setDistributors(response.data);
    } catch (err) {
      console.error('Failed to fetch distributors:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const handleOpenModal = (scheme = null) => {
    if (scheme) {
      setEditingScheme(scheme);
      setFormData({
        distributorId: scheme.distributor_id,
        schemeName: scheme.scheme_name,
        schemeStartDate: scheme.scheme_start_date,
        schemePeriodValue: scheme.scheme_period_value,
        schemePeriodUnit: scheme.scheme_period_unit,
        schemeTargetQty: scheme.scheme_target_qty,
        targetType: scheme.target_type,
        schemeProducts: scheme.scheme_products || [],
        schemeValue: scheme.scheme_value,
        notes: scheme.notes || ''
      });
    } else {
      setEditingScheme(null);
      setFormData({
        distributorId: '',
        schemeName: '',
        schemeStartDate: new Date().toISOString().split('T')[0],
        schemePeriodValue: '',
        schemePeriodUnit: 'months',
        schemeTargetQty: '',
        targetType: 'overall',
        schemeProducts: [],
        schemeValue: '',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingScheme(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate scheme products
    if (formData.schemeProducts.length === 0) {
      setError('Please add at least one product to the scheme');
      return;
    }

    // Validate per-product targets
    if (formData.targetType === 'per_product') {
      const allHaveTargets = formData.schemeProducts.every(p => p.target_qty && p.target_qty > 0);
      if (!allHaveTargets) {
        setError('All products must have individual target quantities for per-product tracking');
        return;
      }
    }

    try {
      const requestData = {
        distributorId: formData.distributorId,
        schemeName: formData.schemeName,
        schemeStartDate: formData.schemeStartDate,
        schemePeriodValue: parseInt(formData.schemePeriodValue),
        schemePeriodUnit: formData.schemePeriodUnit,
        schemeTargetQty: parseFloat(formData.schemeTargetQty),
        targetType: formData.targetType,
        schemeProducts: formData.schemeProducts,
        schemeValue: parseFloat(formData.schemeValue),
        notes: formData.notes
      };

      if (editingScheme) {
        await api.put(`/schemes/${editingScheme.id}`, requestData);
        setSuccess('Scheme updated successfully');
      } else {
        await api.post('/schemes', requestData);
        setSuccess('Scheme created successfully');
      }

      await fetchSchemes();
      handleCloseModal();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleAddProduct = () => {
    if (products.length === 0) {
      setError('No products available. Please add products first.');
      return;
    }

    const selectedProductIds = formData.schemeProducts.map(p => p.product_id);
    const availableProducts = products.filter(p => !selectedProductIds.includes(p.id));

    if (availableProducts.length === 0) {
      setError('All products have been added');
      return;
    }

    const firstAvailable = availableProducts[0];
    setFormData({
      ...formData,
      schemeProducts: [
        ...formData.schemeProducts,
        {
          product_id: firstAvailable.id,
          product_name: firstAvailable.product_name,
          target_qty: formData.targetType === 'per_product' ? '' : 0
        }
      ]
    });
  };

  const handleRemoveProduct = (index) => {
    setFormData({
      ...formData,
      schemeProducts: formData.schemeProducts.filter((_, i) => i !== index)
    });
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...formData.schemeProducts];
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      updatedProducts[index] = {
        ...updatedProducts[index],
        product_id: value,
        product_name: product?.product_name || ''
      };
    } else {
      updatedProducts[index][field] = value;
    }
    setFormData({ ...formData, schemeProducts: updatedProducts });
  };

  const handleCloseScheme = async (schemeId) => {
    if (!window.confirm('Are you sure you want to close this scheme? This will stop tracking progress.')) {
      return;
    }

    try {
      await api.post(`/schemes/${schemeId}/close`);
      setSuccess('Scheme closed successfully');
      await fetchSchemes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to close scheme');
    }
  };

  const handleViewProgress = async (scheme) => {
    try {
      const response = await api.get(`/schemes/${scheme.id}/progress`);
      setSchemeProgress({ ...scheme, ...response.data });
      setShowProgressModal(true);
    } catch (err) {
      setError('Failed to fetch scheme progress');
    }
  };

  const getStatusBadge = (scheme) => {
    if (scheme.status === 'completed' && scheme.achieved) {
      return {
        text: '✓ Achieved',
        color: '#28a745',
        bgColor: '#d4edda'
      };
    } else if (scheme.status === 'closed') {
      return {
        text: 'Closed',
        color: '#6c757d',
        bgColor: '#e2e3e5'
      };
    } else if (scheme.is_expired) {
      return {
        text: '✗ Expired',
        color: '#dc3545',
        bgColor: '#f8d7da'
      };
    } else if (scheme.status === 'active') {
      return {
        text: 'Active',
        color: '#007bff',
        bgColor: '#d1ecf1'
      };
    }
    return {
      text: 'Unknown',
      color: '#6c757d',
      bgColor: '#e2e3e5'
    };
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const columns = [
    { key: 'scheme_name', label: 'Scheme Name' },
    {
      key: 'distributor_name',
      label: 'Distributor',
      render: (scheme) => scheme.distributor_name || '-'
    },
    {
      key: 'scheme_start_date',
      label: 'Start Date',
      render: (scheme) => new Date(scheme.scheme_start_date).toLocaleDateString()
    },
    {
      key: 'scheme_end_date',
      label: 'End Date',
      render: (scheme) => scheme.scheme_end_date ? new Date(scheme.scheme_end_date).toLocaleDateString() : '-'
    },
    {
      key: 'days_remaining',
      label: 'Days Left',
      render: (scheme) => {
        if (scheme.status === 'closed' || scheme.status === 'completed') {
          return '-';
        }
        return scheme.days_remaining > 0 ? scheme.days_remaining : 0;
      }
    },
    {
      key: 'scheme_value',
      label: 'Value',
      render: (scheme) => (
        <span style={{ fontWeight: '700', color: '#28a745' }}>
          ₹{parseFloat(scheme.scheme_value || 0).toFixed(2)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (scheme) => {
        const badge = getStatusBadge(scheme);
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
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (scheme) => (
        <div className="action-buttons">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewProgress(scheme);
            }}
            className="btn btn-primary"
            style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
          >
            Progress
          </button>
          {scheme.status === 'active' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal(scheme);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseScheme(scheme.id);
                }}
                className="btn"
                style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem', background: '#6c757d', color: '#fff' }}
              >
                Close
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <>
      {success && <div className="success" style={{ marginBottom: '1rem' }}>{success}</div>}
      {error && !showModal && (
        <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>
      )}

      <div className="mobile-stack" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
        <h2 style={{ color: '#000', margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: '700', letterSpacing: '0.5px' }}>
          Distributor Schemes
        </h2>
        <button onClick={() => handleOpenModal()} className="btn btn-success">
          Add New Scheme
        </button>
      </div>

      <MobileTable
        columns={columns}
        data={schemes}
        onRowClick={handleViewProgress}
        enableSearch={true}
        enableSort={true}
        defaultSortKey="scheme_start_date"
        defaultSortOrder="desc"
      />

      {/* Add/Edit Scheme Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
            <h2>{editingScheme ? 'Edit Scheme' : 'Add New Scheme'}</h2>
            {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="schemeName">Scheme Name *</label>
                <input
                  type="text"
                  id="schemeName"
                  className="form-control"
                  value={formData.schemeName}
                  onChange={(e) => setFormData({ ...formData, schemeName: e.target.value })}
                  required
                  placeholder="e.g., Summer 2024 Target Scheme"
                />
              </div>

              <div className="form-group">
                <label htmlFor="distributor">Distributor *</label>
                <select
                  id="distributor"
                  className="form-control"
                  value={formData.distributorId}
                  onChange={(e) => setFormData({ ...formData, distributorId: e.target.value })}
                  required
                >
                  <option value="">-- Select Distributor --</option>
                  {distributors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="schemeStartDate">Start Date *</label>
                  <input
                    type="date"
                    id="schemeStartDate"
                    className="form-control"
                    value={formData.schemeStartDate}
                    onChange={(e) => setFormData({ ...formData, schemeStartDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="schemeValue">Scheme Value (₹) *</label>
                  <input
                    type="number"
                    id="schemeValue"
                    className="form-control"
                    value={formData.schemeValue}
                    onChange={(e) => setFormData({ ...formData, schemeValue: e.target.value })}
                    step="0.01"
                    min="0"
                    required
                    placeholder="Reward amount"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="schemePeriodValue">Scheme Period *</label>
                  <input
                    type="number"
                    id="schemePeriodValue"
                    className="form-control"
                    value={formData.schemePeriodValue}
                    onChange={(e) => setFormData({ ...formData, schemePeriodValue: e.target.value })}
                    min="1"
                    max="100"
                    required
                    placeholder="Duration"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="schemePeriodUnit">Period Unit *</label>
                  <select
                    id="schemePeriodUnit"
                    className="form-control"
                    value={formData.schemePeriodUnit}
                    onChange={(e) => setFormData({ ...formData, schemePeriodUnit: e.target.value })}
                    required
                  >
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="targetType">Target Type *</label>
                <select
                  id="targetType"
                  className="form-control"
                  value={formData.targetType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setFormData({
                      ...formData,
                      targetType: newType,
                      schemeProducts: formData.schemeProducts.map(p => ({
                        ...p,
                        target_qty: newType === 'per_product' ? (p.target_qty || '') : 0
                      }))
                    });
                  }}
                  required
                >
                  <option value="overall">Overall Quantity (sum of all products)</option>
                  <option value="per_product">Separate Quantity for Each Product</option>
                </select>
                <small style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>
                  {formData.targetType === 'overall'
                    ? 'Total quantity target across all products'
                    : 'Each product must meet its individual target'}
                </small>
              </div>

              {formData.targetType === 'overall' && (
                <div className="form-group">
                  <label htmlFor="schemeTargetQty">Target Quantity *</label>
                  <input
                    type="number"
                    id="schemeTargetQty"
                    className="form-control"
                    value={formData.schemeTargetQty}
                    onChange={(e) => setFormData({ ...formData, schemeTargetQty: e.target.value })}
                    step="0.01"
                    min="0"
                    required
                    placeholder="Total quantity target"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Scheme Products *</label>
                {products.length === 0 && (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#fff3cd',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    color: '#856404'
                  }}>
                    Loading products... If this persists, please add some products first.
                  </div>
                )}
                {formData.schemeProducts.map((product, index) => (
                  <div key={index} style={{
                    display: 'grid',
                    gridTemplateColumns: formData.targetType === 'per_product' ? '2fr 1fr auto' : '1fr auto',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                    alignItems: 'center'
                  }}>
                    <select
                      className="form-control"
                      value={product.product_id}
                      onChange={(e) => handleProductChange(index, 'product_id', e.target.value)}
                      required
                    >
                      <option value="">-- Select Product --</option>
                      {products.map(p => (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={formData.schemeProducts.some((sp, i) => i !== index && sp.product_id === p.id)}
                        >
                          {p.product_name}
                        </option>
                      ))}
                    </select>

                    {formData.targetType === 'per_product' && (
                      <input
                        type="number"
                        className="form-control"
                        value={product.target_qty}
                        onChange={(e) => handleProductChange(index, 'target_qty', e.target.value)}
                        placeholder="Target Qty"
                        step="0.01"
                        min="0"
                        required
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(index)}
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="btn btn-primary"
                  style={{ marginTop: '0.5rem' }}
                  disabled={products.length === 0}
                  title={products.length === 0 ? 'No products available' : 'Add product to scheme'}
                >
                  + Add Product {products.length === 0 && '(No products available)'}
                </button>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes (Optional)</label>
                <textarea
                  id="notes"
                  className="form-control"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  placeholder="Additional notes about this scheme"
                />
              </div>

              <div className="modal-buttons">
                <button type="submit" className="btn btn-primary">
                  {editingScheme ? 'Update Scheme' : 'Create Scheme'}
                </button>
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && schemeProgress && (
        <div className="modal-overlay" onClick={() => setShowProgressModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Scheme Progress</h2>
              <button
                onClick={() => setShowProgressModal(false)}
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
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>{schemeProgress.scheme_name}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Distributor</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem', fontWeight: '600' }}>
                    {schemeProgress.distributor_name}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Status</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem', fontWeight: '600' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      backgroundColor: schemeProgress.status === 'completed' && schemeProgress.achieved ? '#d4edda' :
                        schemeProgress.status === 'closed' ? '#e2e3e5' :
                        schemeProgress.is_expired ? '#f8d7da' : '#d1ecf1',
                      color: schemeProgress.status === 'completed' && schemeProgress.achieved ? '#28a745' :
                        schemeProgress.status === 'closed' ? '#6c757d' :
                        schemeProgress.is_expired ? '#dc3545' : '#007bff'
                    }}>
                      {schemeProgress.status === 'completed' && schemeProgress.achieved ? '✓ Achieved' :
                       schemeProgress.status === 'closed' ? 'Closed' :
                       schemeProgress.is_expired ? '✗ Expired' : 'Active'}
                    </span>
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Start Date</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem', fontWeight: '600' }}>
                    {new Date(schemeProgress.scheme_start_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>End Date</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem', fontWeight: '600' }}>
                    {new Date(schemeProgress.scheme_end_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Scheme Period</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem', fontWeight: '600' }}>
                    {schemeProgress.scheme_period_value} {schemeProgress.scheme_period_unit}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Days Remaining</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem', fontWeight: '600', color: schemeProgress.days_remaining < 0 ? '#dc3545' : '#000' }}>
                    {schemeProgress.days_remaining > 0 ? schemeProgress.days_remaining : 'Expired'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Target Type</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem', fontWeight: '600' }}>
                    {schemeProgress.target_type === 'overall' ? 'Overall Quantity' : 'Per Product'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Scheme Value</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.25rem', fontWeight: '700', color: '#28a745' }}>
                    ₹{parseFloat(schemeProgress.scheme_value).toFixed(2)}
                  </p>
                </div>
              </div>

              {schemeProgress.notes && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #dee2e6' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Notes</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#333', whiteSpace: 'pre-wrap' }}>
                    {schemeProgress.notes}
                  </p>
                </div>
              )}

              {schemeProgress.achieved_date && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #dee2e6' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Achievement Date</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem', fontWeight: '600', color: '#28a745' }}>
                    {new Date(schemeProgress.achieved_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Products in Scheme */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#fff',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #dee2e6'
            }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>
                Products in Scheme ({schemeProgress.scheme_products?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {schemeProgress.scheme_products?.map((product, index) => (
                  <div key={index} style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#e3f2fd',
                    borderRadius: '6px',
                    border: '1px solid #2196F3',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#0d47a1'
                  }}>
                    {product.product_name}
                    {schemeProgress.target_type === 'per_product' && product.target_qty && (
                      <span style={{ marginLeft: '0.5rem', color: '#1565c0' }}>
                        (Target: {parseFloat(product.target_qty).toFixed(0)})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {schemeProgress.target_type === 'overall' ? (
              <div style={{
                padding: '1.5rem',
                backgroundColor: schemeProgress.achieved ? '#d4edda' : '#fff3cd',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: `2px solid ${schemeProgress.achieved ? '#28a745' : '#ffc107'}`
              }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Overall Progress</p>
                  <div style={{ margin: '1rem 0' }}>
                    <div style={{
                      width: '100%',
                      height: '30px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '15px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min(schemeProgress.progress_percentage, 100)}%`,
                        height: '100%',
                        backgroundColor: schemeProgress.achieved ? '#28a745' : '#ffc107',
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '700' }}>
                      {schemeProgress.progress_percentage}%
                    </p>
                  </div>
                  <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                    {parseFloat(schemeProgress.total_qty || 0).toFixed(2)} / {parseFloat(schemeProgress.target_qty || 0).toFixed(2)} units
                  </p>
                  {schemeProgress.achieved && (
                    <p style={{ margin: '1rem 0 0 0', fontSize: '1.125rem', fontWeight: '700', color: '#28a745' }}>
                      ✓ Target Achieved!
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Product-wise Progress</h4>
                {schemeProgress.product_progress && schemeProgress.product_progress.map((product, index) => (
                  <div key={index} style={{
                    padding: '1rem',
                    backgroundColor: product.achieved ? '#d4edda' : '#fff3cd',
                    borderRadius: '8px',
                    marginBottom: '0.75rem',
                    border: `1px solid ${product.achieved ? '#28a745' : '#ffc107'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '1rem' }}>{product.product_name}</p>
                      {product.achieved && (
                        <span style={{ color: '#28a745', fontWeight: '700' }}>✓ Achieved</span>
                      )}
                    </div>
                    <div style={{
                      width: '100%',
                      height: '20px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      marginBottom: '0.5rem'
                    }}>
                      <div style={{
                        width: `${Math.min((parseFloat(product.current_qty || 0) / parseFloat(product.target_qty || 1)) * 100, 100)}%`,
                        height: '100%',
                        backgroundColor: product.achieved ? '#28a745' : '#ffc107',
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
                      {parseFloat(product.current_qty || 0).toFixed(2)} / {parseFloat(product.target_qty || 0).toFixed(2)} units ({((parseFloat(product.current_qty || 0) / parseFloat(product.target_qty || 1)) * 100).toFixed(1)}%)
                    </p>
                  </div>
                ))}
                {schemeProgress.achieved && (
                  <div style={{
                    textAlign: 'center',
                    padding: '1rem',
                    backgroundColor: '#d4edda',
                    borderRadius: '8px',
                    marginTop: '1rem',
                    border: '2px solid #28a745'
                  }}>
                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#28a745' }}>
                      ✓ All Product Targets Achieved!
                    </p>
                  </div>
                )}
              </div>
            )}

            <div style={{
              padding: '1rem',
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              marginTop: '1.5rem',
              border: '1px solid #2196F3'
            }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#1565c0' }}>Orders Counted</p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.125rem', fontWeight: '700', color: '#0d47a1' }}>
                {schemeProgress.orders_count} orders
              </p>
            </div>

            {/* Metadata */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginTop: '1rem',
              border: '1px solid #dee2e6'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                {schemeProgress.created_at && (
                  <div>
                    <p style={{ margin: 0, color: '#666' }}>Created On</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontWeight: '600' }}>
                      {new Date(schemeProgress.created_at).toLocaleString()}
                    </p>
                  </div>
                )}
                {schemeProgress.updated_at && (
                  <div>
                    <p style={{ margin: 0, color: '#666' }}>Last Updated</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontWeight: '600' }}>
                      {new Date(schemeProgress.updated_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SchemesTab;
