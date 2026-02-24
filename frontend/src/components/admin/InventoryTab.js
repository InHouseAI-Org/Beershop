import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Lock, Unlock } from 'lucide-react';

const InventoryTab = () => {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [inventoryRes, productsRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/products')
      ]);

      setInventory(inventoryRes.data);
      setProducts(productsRes.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch inventory data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.product_name : 'Unknown Product';
  };

  const toggleTableLock = () => {
    setIsLocked(prev => {
      const newLocked = !prev;
      // If locking, cancel any active edit
      if (newLocked && editingId) {
        setEditingId(null);
        setEditQty('');
      }
      return newLocked;
    });
  };

  const handleEdit = (item) => {
    if (isLocked) {
      setError('Please unlock the table before editing');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setEditingId(item.id);
    setEditQty(item.qty);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditQty('');
  };

  const handleUpdate = async (id) => {
    try {
      await api.put(`/inventory/${id}`, { qty: parseInt(editQty) });
      setEditingId(null);
      setEditQty('');
      fetchData();
    } catch (err) {
      setError('Failed to update inventory');
      console.error(err);
    }
  };

  // Calculate total inventory value
  const totalInventoryValue = inventory.reduce((sum, item) => {
    const qty = parseFloat(item.qty || 0);
    const salePrice = parseFloat(item.sale_price || 0);
    return sum + (qty * salePrice);
  }, 0);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: '#000', margin: 0, fontSize: '2rem', fontWeight: '700', letterSpacing: '0.5px' }}>
          Inventory Management
        </h2>
        <button
          onClick={toggleTableLock}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: isLocked ? '#000' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
            transition: 'all 0.3s',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
          title={isLocked ? 'Click to unlock table for editing' : 'Click to lock table'}
        >
          {isLocked ? (
            <>
              <Lock size={20} />
              Locked
            </>
          ) : (
            <>
              <Unlock size={20} />
              Unlocked
            </>
          )}
        </button>
      </div>

      {/* Total Inventory Value Summary */}
      <div style={{
        padding: '1.5rem',
        backgroundColor: '#e3f2fd',
        borderRadius: '12px',
        marginBottom: '2rem',
        border: '2px solid #2196F3',
        boxShadow: '0 4px 12px rgba(33, 150, 243, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#1565c0', fontWeight: '600' }}>
              Total Inventory Value (at Sale Price)
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: '700', color: '#0d47a1' }}>
              ₹{totalInventoryValue.toFixed(2)}
            </p>
          </div>
          <div style={{
            padding: '1rem',
            backgroundColor: '#fff',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#666', fontWeight: '600' }}>
              Total Items
            </p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#000' }}>
              {inventory.length}
            </p>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Current Quantity</th>
              <th>Sale Price</th>
              <th>Inventory Value</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  No inventory data available
                </td>
              </tr>
            ) : (
              inventory.map(item => {
                const qty = parseFloat(item.qty || 0);
                const salePrice = parseFloat(item.sale_price || 0);
                const itemValue = qty * salePrice;

                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '600' }}>{getProductName(item.product_id)}</td>
                    <td>
                      {editingId === item.id ? (
                        <input
                          type="number"
                          className="form-control"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          style={{ width: '150px', display: 'inline-block' }}
                        />
                      ) : (
                        <span style={{ fontSize: '1.25rem', fontWeight: '700', color: item.qty === null ? '#999' : '#000' }}>
                          {item.qty === null ? 'Not Set' : item.qty}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '1rem', fontWeight: '600', color: '#666' }}>
                      ₹{salePrice.toFixed(2)}
                    </td>
                    <td style={{ fontSize: '1.125rem', fontWeight: '700', color: '#2196F3' }}>
                      ₹{itemValue.toFixed(2)}
                    </td>
                    <td>
                      {editingId === item.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleUpdate(item.id)}
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancel}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(item)}
                          className="btn btn-primary"
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem',
                            opacity: isLocked ? 0.5 : 1,
                            cursor: isLocked ? 'not-allowed' : 'pointer'
                          }}
                          disabled={isLocked}
                        >
                          Edit Quantity
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default InventoryTab;
