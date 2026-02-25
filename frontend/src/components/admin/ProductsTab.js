import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import MobileTable from '../common/MobileTable';
import { formatDate } from '../../utils/dateUtils';

const ProductsTab = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    productName: '',
    salePrice: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        productName: product.product_name,
        salePrice: product.sale_price
      });
    } else {
      setEditingProduct(null);
      setFormData({
        productName: '',
        salePrice: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      productName: '',
      salePrice: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, formData);
      } else {
        await api.post('/products', formData);
      }
      await fetchProducts();
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await api.delete(`/products/${id}`);
      await fetchProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete product');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const columns = [
    { key: 'product_name', label: 'Product Name' },
    {
      key: 'sale_price',
      label: 'Sale Price',
      render: (product) => (
        <span style={{ fontWeight: '700', color: '#4CAF50', fontSize: '1.125rem' }}>
          ₹{parseFloat(product.sale_price).toFixed(2)}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (product) => formatDate(product.created_at)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (product) => (
        <div className="action-buttons">
          <button
            onClick={() => handleOpenModal(product)}
            className="btn btn-primary"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(product.id)}
            className="btn btn-danger"
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <div className="mobile-stack" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#000', margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: '700', letterSpacing: '0.5px' }}>
          Products
        </h2>
        <button onClick={() => handleOpenModal()} className="btn btn-success">
          Add New Product
        </button>
      </div>

      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <MobileTable columns={columns} data={products} />

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="productName">Product Name</label>
                <input
                  type="text"
                  id="productName"
                  className="form-control"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="salePrice">Sale Price</label>
                <input
                  type="number"
                  id="salePrice"
                  className="form-control"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                  step="1"
                  min="0"
                  required
                />
              </div>

              <div className="modal-buttons">
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Update' : 'Create'}
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

export default ProductsTab;
