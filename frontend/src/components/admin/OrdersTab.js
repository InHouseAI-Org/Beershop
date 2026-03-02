import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Package, Calendar, Trash2, Plus } from 'lucide-react';
import MobileTable from '../common/MobileTable';

const OrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [lastSalesReportDate, setLastSalesReportDate] = useState(null);
  const [formData, setFormData] = useState({
    distributorId: '',
    orderDate: new Date().toISOString().split('T')[0],
    orderData: [],
    tax: '',
    misc: '',
    discount: '',
    scheme: '',
    paymentOutstandingDate: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchDistributors();
    fetchProducts();
    fetchLastSalesReportDate();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchDistributors = async () => {
    try {
      const response = await api.get('/distributors');
      setDistributors(response.data);
    } catch (err) {
      console.error('Failed to fetch distributors');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (err) {
      console.error('Failed to fetch products');
    }
  };

  const fetchLastSalesReportDate = async () => {
    try {
      const response = await api.get('/sales');
      const sales = response.data;

      if (sales && sales.length > 0) {
        // Find the most recent approved sale
        const approvedSales = sales.filter(sale => sale.status === 'approved' || !sale.status);

        if (approvedSales.length > 0) {
          // Sort by date descending and get the most recent
          const sortedSales = approvedSales.sort((a, b) => new Date(b.date) - new Date(a.date));
          const lastSaleDate = new Date(sortedSales[0].date);
          setLastSalesReportDate(lastSaleDate.toISOString().split('T')[0]);
        } else {
          // No approved sales found - allow orders from 30 days ago
          const defaultMinDate = new Date();
          defaultMinDate.setDate(defaultMinDate.getDate() - 30);
          setLastSalesReportDate(defaultMinDate.toISOString().split('T')[0]);
        }
      } else {
        // No sales reports at all - allow orders from 30 days ago
        const defaultMinDate = new Date();
        defaultMinDate.setDate(defaultMinDate.getDate() - 30);
        setLastSalesReportDate(defaultMinDate.toISOString().split('T')[0]);
      }
    } catch (err) {
      console.error('Failed to fetch last sales report date');
      // If error, allow orders from 30 days ago
      const defaultMinDate = new Date();
      defaultMinDate.setDate(defaultMinDate.getDate() - 30);
      setLastSalesReportDate(defaultMinDate.toISOString().split('T')[0]);
    }
  };

  const handleOpenOrderForm = (order = null) => {
    if (order) {
      setEditingOrder(order);
      setFormData({
        distributorId: order.distributor_id,
        orderDate: order.order_date ? new Date(order.order_date).toISOString().split('T')[0] : '',
        orderData: order.order_data || [],
        tax: order.tax || '',
        misc: order.misc || '',
        discount: order.discount || '',
        scheme: order.scheme || '',
        paymentOutstandingDate: order.payment_outstanding_date ? new Date(order.payment_outstanding_date).toISOString().split('T')[0] : ''
      });
    } else {
      setEditingOrder(null);
      setFormData({
        distributorId: '',
        orderDate: new Date().toISOString().split('T')[0],
        orderData: [],
        tax: '',
        misc: '',
        discount: '',
        scheme: '',
        paymentOutstandingDate: ''
      });
    }
    setError('');
    setShowOrderForm(true);
  };

  const handleCloseOrderForm = () => {
    setShowOrderForm(false);
    setEditingOrder(null);
    setFormData({
      distributorId: '',
      orderDate: new Date().toISOString().split('T')[0],
      orderData: [],
      tax: '',
      misc: '',
      discount: '',
      scheme: '',
      paymentOutstandingDate: ''
    });
  };

  const handleShowOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleCloseOrderDetails = () => {
    setShowOrderDetails(false);
    setSelectedOrder(null);
  };

  const addOrderItem = () => {
    setFormData({
      ...formData,
      orderData: [...formData.orderData, { product_id: '', qty: '', buy_price: '' }]
    });
  };

  const updateOrderItem = (index, field, value) => {
    const updated = [...formData.orderData];
    updated[index][field] = value;
    setFormData({ ...formData, orderData: updated });
  };

  const removeOrderItem = (index) => {
    setFormData({
      ...formData,
      orderData: formData.orderData.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    if (!formData.distributorId) {
      setError('Please select a distributor');
      return;
    }

    if (formData.orderData.length === 0) {
      setError('Please add at least one order item');
      return;
    }

    // Validate all items have required fields
    const invalidItem = formData.orderData.find(item =>
      !item.product_id || !item.qty || !item.buy_price
    );

    if (invalidItem) {
      setError('Please fill all fields for each order item');
      return;
    }

    try {
      // Calculate total for each order item
      const orderDataWithTotals = formData.orderData.map(item => ({
        ...item,
        total: (parseFloat(item.qty || 0) * parseFloat(item.buy_price || 0)).toFixed(2)
      }));

      const submitData = {
        ...formData,
        orderData: orderDataWithTotals.length > 0 ? orderDataWithTotals : null
      };

      console.log('Submitting order data with totals:', submitData);

      if (editingOrder) {
        await api.put(`/orders/${editingOrder.id}`, submitData);
      } else {
        await api.post('/orders', submitData);
      }
      await fetchOrders();
      handleCloseOrderForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const getDistributorName = (distributorId) => {
    const distributor = distributors.find(d => d.id === distributorId);
    return distributor ? distributor.name : 'Unknown';
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.product_name : 'Unknown Product';
  };

  const getTotalOrderValue = (orderData) => {
    if (!orderData || !Array.isArray(orderData)) return 0;
    return orderData.reduce((total, item) => {
      return total + (parseFloat(item.qty || 0) * parseFloat(item.buy_price || 0));
    }, 0);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  // Show order form page if showOrderForm is true
  if (showOrderForm) {
    return (
      <div style={{ minHeight: '100vh', padding: '2rem 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }} className="order-form-header">
            <h2 style={{ color: '#000', margin: 0, fontSize: '2rem', fontWeight: '700', letterSpacing: '0.5px' }}>
              {editingOrder ? 'Edit Order' : 'Create New Order'}
            </h2>
            <button onClick={handleCloseOrderForm} className="btn btn-secondary">
              Cancel
            </button>
          </div>

          {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            {/* Section 1: Basic Information */}
            <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px solid #e0e0e0' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#000' }}>
                Basic Information
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="form-group">
                  <label htmlFor="distributorId" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', fontWeight: '600' }}>
                    <Package size={20} />
                    Distributor *
                  </label>
                  <select
                    id="distributorId"
                    className="form-control"
                    value={formData.distributorId}
                    onChange={(e) => setFormData({ ...formData, distributorId: e.target.value })}
                    style={{ fontSize: '1.125rem', padding: '1rem' }}
                    required
                  >
                    <option value="">Select a distributor</option>
                    {distributors.map(distributor => (
                      <option key={distributor.id} value={distributor.id}>
                        {distributor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="orderDate" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', fontWeight: '600' }}>
                    <Calendar size={20} />
                    Order Date
                  </label>
                  <input
                    type="date"
                    id="orderDate"
                    className="form-control"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    min={(() => {
                      if (!lastSalesReportDate) return new Date().toISOString().split('T')[0];
                      // Add 1 day to the last sales report date
                      const minDate = new Date(lastSalesReportDate);
                      minDate.setDate(minDate.getDate() + 1);
                      return minDate.toISOString().split('T')[0];
                    })()}
                    max={new Date().toISOString().split('T')[0]}
                    disabled={editingOrder !== null}
                    style={{
                      fontSize: '1.125rem',
                      padding: '1rem',
                      fontWeight: '600',
                      color: '#000',
                      backgroundColor: editingOrder !== null ? '#f5f5f5' : '#fff',
                      cursor: editingOrder !== null ? 'not-allowed' : 'auto'
                    }}
                  />
                  <small style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>
                    {editingOrder ? 'Order date cannot be changed after creation' : `You can select dates from ${(() => {
                      const minDate = new Date(lastSalesReportDate);
                      minDate.setDate(minDate.getDate() + 1);
                      return minDate.toLocaleDateString();
                    })()} to today`}
                  </small>
                </div>
              </div>
            </div>

            {/* Section 2: Order Items */}
            <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px solid #e0e0e0' }}>
              <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }} className="order-items-header">
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0, color: '#000' }}>
                  Order Items *
                </h3>
                <button
                  type="button"
                  onClick={addOrderItem}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Plus size={20} />
                  Add Item
                </button>
              </div>

              {formData.orderData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '2px dashed #dee2e6' }}>
                  <p style={{ color: '#666', fontSize: '1.125rem', margin: 0 }}>No items added yet. Click "Add Item" to start.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {formData.orderData.map((item, index) => (
                    <div key={index} style={{ backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', position: 'relative' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>Item {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeOrderItem(index)}
                          className="btn btn-danger"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', marginTop: '0.5rem' }}
                        >
                          <Trash2 size={16} />
                          Remove
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                        <div className="form-group">
                          <label style={{ fontWeight: '600' }}>Product *</label>
                          <select
                            className="form-control"
                            value={item.product_id}
                            onChange={(e) => updateOrderItem(index, 'product_id', e.target.value)}
                            style={{ fontSize: '1rem', padding: '0.875rem' }}
                            required
                          >
                            <option value="">Select Product</option>
                            {products.map(product => (
                              <option key={product.id} value={product.id}>
                                {product.product_name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label style={{ fontWeight: '600' }}>Quantity *</label>
                          <input
                            type="number"
                            className="form-control"
                            value={item.qty}
                            onChange={(e) => updateOrderItem(index, 'qty', e.target.value)}
                            step="1"
                            min="0"
                            placeholder="0"
                            style={{ fontSize: '1rem', padding: '0.875rem' }}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label style={{ fontWeight: '600' }}>Buy Price (₹) *</label>
                          <input
                            type="number"
                            className="form-control"
                            value={item.buy_price}
                            onChange={(e) => updateOrderItem(index, 'buy_price', e.target.value)}
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            style={{ fontSize: '1rem', padding: '0.875rem' }}
                            required
                          />
                        </div>
                      </div>

                      {item.qty && item.buy_price && (
                        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                          <strong style={{ color: '#1565c0' }}>Item Total: ₹{(parseFloat(item.qty || 0) * parseFloat(item.buy_price || 0)).toFixed(2)}</strong>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: Payment & Tax */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#000' }}>
                Payment & Additional Charges
              </h3>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label htmlFor="tax" style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                    Tax (₹)
                  </label>
                  <input
                    type="number"
                    id="tax"
                    className="form-control"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    style={{ fontSize: '1.125rem', padding: '1rem' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="misc" style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                    Miscellaneous (₹)
                  </label>
                  <input
                    type="number"
                    id="misc"
                    className="form-control"
                    value={formData.misc}
                    onChange={(e) => setFormData({ ...formData, misc: e.target.value })}
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    style={{ fontSize: '1.125rem', padding: '1rem' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="scheme" style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                    Scheme (₹)
                  </label>
                  <input
                    type="number"
                    id="scheme"
                    className="form-control"
                    value={formData.scheme}
                    onChange={(e) => setFormData({ ...formData, scheme: e.target.value })}
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    style={{ fontSize: '1.125rem', padding: '1rem' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="discount" style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                    Discount (₹)
                  </label>
                  <input
                    type="number"
                    id="discount"
                    className="form-control"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    style={{ fontSize: '1.125rem', padding: '1rem' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="paymentOutstandingDate" style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                  Payment Outstanding Date
                </label>
                <input
                  type="date"
                  id="paymentOutstandingDate"
                  className="form-control"
                  value={formData.paymentOutstandingDate}
                  onChange={(e) => setFormData({ ...formData, paymentOutstandingDate: e.target.value })}
                  style={{ fontSize: '1.125rem', padding: '1rem' }}
                />
              </div>

              {/* Order Summary */}
              <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '2px solid #dee2e6' }}>
                <h4 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>Order Summary</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Items Total</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.25rem', fontWeight: '700' }}>
                      ₹{getTotalOrderValue(formData.orderData).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Tax</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.25rem', fontWeight: '700' }}>
                      +₹{parseFloat(formData.tax || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Miscellaneous</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.25rem', fontWeight: '700' }}>
                      +₹{parseFloat(formData.misc || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Scheme</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.25rem', fontWeight: '700', color: '#f57c00' }}>
                      -₹{parseFloat(formData.scheme || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Discount</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.25rem', fontWeight: '700', color: '#f57c00' }}>
                      -₹{parseFloat(formData.discount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Grand Total</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#2e7d32' }}>
                      ₹{(getTotalOrderValue(formData.orderData) + parseFloat(formData.tax || 0) + parseFloat(formData.misc || 0) - parseFloat(formData.scheme || 0) - parseFloat(formData.discount || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '2rem', borderTop: '2px solid #e0e0e0' }}>
              <button
                type="button"
                onClick={handleCloseOrderForm}
                className="btn btn-secondary"
                style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-success"
                style={{ padding: '1rem 2rem', fontSize: '1.125rem', fontWeight: '600' }}
              >
                {editingOrder ? 'Update Order' : 'Create Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const calculateGrandTotal = (order) => {
    return (
      getTotalOrderValue(order.order_data) +
      parseFloat(order.tax || 0) +
      parseFloat(order.misc || 0) -
      parseFloat(order.scheme || 0) -
      parseFloat(order.discount || 0)
    );
  };

  const columns = [
    {
      key: 'order_date',
      label: 'Order Date',
      render: (order) => new Date(order.order_date).toLocaleDateString()
    },
    {
      key: 'distributor_id',
      label: 'Distributor',
      render: (order) => getDistributorName(order.distributor_id)
    },
    {
      key: 'items',
      label: 'Items',
      sortable: false,
      render: (order) => (
        <span style={{ fontWeight: '600' }}>
          {order.order_data && Array.isArray(order.order_data) ? order.order_data.length : 0} items
        </span>
      )
    },
    {
      key: 'items_total',
      label: 'Items Total',
      sortable: false,
      render: (order) => `₹${getTotalOrderValue(order.order_data).toFixed(2)}`
    },
    {
      key: 'tax',
      label: 'Tax',
      render: (order) => `₹${parseFloat(order.tax || 0).toFixed(2)}`
    },
    {
      key: 'misc',
      label: 'Misc',
      render: (order) => `₹${parseFloat(order.misc || 0).toFixed(2)}`
    },
    {
      key: 'scheme',
      label: 'Scheme',
      render: (order) => (
        <span style={{ color: '#f57c00' }}>₹{parseFloat(order.scheme || 0).toFixed(2)}</span>
      )
    },
    {
      key: 'discount',
      label: 'Discount',
      render: (order) => (
        <span style={{ color: '#f57c00' }}>₹{parseFloat(order.discount || 0).toFixed(2)}</span>
      )
    },
    {
      key: 'grand_total',
      label: 'Grand Total',
      sortable: false,
      render: (order) => (
        <span style={{ fontWeight: '700', color: '#2e7d32', fontSize: '1.125rem' }}>
          ₹{calculateGrandTotal(order).toFixed(2)}
        </span>
      )
    },
    {
      key: 'payment_outstanding_date',
      label: 'Payment Date',
      render: (order) => order.payment_outstanding_date ? new Date(order.payment_outstanding_date).toLocaleDateString() : '-'
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (order) => (
        <div className="action-buttons">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShowOrderDetails(order);
            }}
            className="btn btn-primary"
          >
            Details
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenOrderForm(order);
            }}
            className="btn btn-secondary"
          >
            Edit
          </button>
        </div>
      )
    }
  ];

  // Show orders list if not in form mode
  return (
    <>
      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="mobile-stack" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#000', margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: '700', letterSpacing: '0.5px' }}>
          Orders
        </h2>
        <button onClick={() => handleOpenOrderForm()} className="btn btn-success">
          <Plus size={16} style={{ marginRight: '0.5rem' }} />
          Add New Order
        </button>
      </div>

      <MobileTable
        columns={columns}
        data={orders}
        onRowClick={handleShowOrderDetails}
        enableSearch={true}
        enableSort={true}
        defaultSortKey="order_date"
        defaultSortOrder="desc"
      />

      {showOrderDetails && selectedOrder && (
        <div className="modal-overlay" onClick={handleCloseOrderDetails}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Order Details</h2>
              <button
                onClick={handleCloseOrderDetails}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Close
              </button>
            </div>

            {/* Order Info */}
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #dee2e6'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Order Date</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.125rem', fontWeight: '600' }}>
                    {new Date(selectedOrder.order_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Distributor</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.125rem', fontWeight: '600' }}>
                    {getDistributorName(selectedOrder.distributor_id)}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Payment Date</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.125rem', fontWeight: '600' }}>
                    {selectedOrder.payment_outstanding_date
                      ? new Date(selectedOrder.payment_outstanding_date).toLocaleDateString()
                      : 'Not Set'}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              Order Items ({selectedOrder.order_data?.length || 0})
            </h3>

            {(!selectedOrder.order_data || selectedOrder.order_data.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                No items in this order
              </div>
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Buy Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.order_data.map((item, index) => (
                      <tr key={index}>
                        <td style={{ fontWeight: '600' }}>{getProductName(item.product_id)}</td>
                        <td>{parseFloat(item.qty || 0).toFixed(2)}</td>
                        <td>₹{parseFloat(item.buy_price || 0).toFixed(2)}</td>
                        <td style={{ fontWeight: '700', color: '#2196F3' }}>
                          ₹{(parseFloat(item.qty || 0) * parseFloat(item.buy_price || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Order Summary */}
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '2px solid #dee2e6'
            }}>
              <h4 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem' }}>Order Summary</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1rem', color: '#666' }}>Items Subtotal:</span>
                  <span style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                    ₹{getTotalOrderValue(selectedOrder.order_data).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1rem', color: '#666' }}>Tax:</span>
                  <span style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                    +₹{parseFloat(selectedOrder.tax || 0).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1rem', color: '#666' }}>Miscellaneous:</span>
                  <span style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                    +₹{parseFloat(selectedOrder.misc || 0).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1rem', color: '#666' }}>Scheme:</span>
                  <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#f57c00' }}>
                    -₹{parseFloat(selectedOrder.scheme || 0).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1rem', color: '#666' }}>Discount:</span>
                  <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#f57c00' }}>
                    -₹{parseFloat(selectedOrder.discount || 0).toFixed(2)}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  marginTop: '0.75rem',
                  borderTop: '2px solid #dee2e6'
                }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>Grand Total:</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2e7d32' }}>
                    ₹{(
                      getTotalOrderValue(selectedOrder.order_data) +
                      parseFloat(selectedOrder.tax || 0) +
                      parseFloat(selectedOrder.misc || 0) -
                      parseFloat(selectedOrder.scheme || 0) -
                      parseFloat(selectedOrder.discount || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrdersTab;
