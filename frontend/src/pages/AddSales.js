import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import api from '../utils/api';

const AddSales = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [creditHolders, setCreditHolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form data
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [productData, setProductData] = useState({});
  const [cashCollected, setCashCollected] = useState('');
  const [upiCollected, setUpiCollected] = useState('');
  const [creditEntries, setCreditEntries] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [dateError, setDateError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideEmpty, setHideEmpty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, creditHoldersRes, inventoryRes] = await Promise.all([
        api.get('/products'),
        api.get('/credit-holders'),
        api.get('/inventory')
      ]);

      setProducts(productsRes.data);
      setCreditHolders(creditHoldersRes.data);

      // Initialize product data with opening stock from inventory
      const initialData = {};
      productsRes.data.forEach(product => {
        // Find inventory for this product
        const inventoryItem = inventoryRes.data.find(inv => inv.product_id === product.id);

        initialData[product.id] = {
          openingStock: inventoryItem ? (inventoryItem.qty || 0) : 0,
          closingStock: '',
          sale: ''
        };
      });
      setProductData(initialData);

      setLoading(false);
    } catch (err) {
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const handleProductChange = (productId, field, value) => {
    const data = { ...productData[productId] };
    data[field] = value;

    // Auto-calculate based on: Sale = Opening Stock - Closing Stock
    if (field === 'closingStock' && data.openingStock !== '') {
      // User entered closing stock, calculate sale
      const opening = parseFloat(data.openingStock) || 0;
      const closing = parseFloat(value) || 0;
      data.sale = (opening - closing).toString();
    } else if (field === 'sale' && data.openingStock !== '') {
      // User entered sale, calculate closing stock
      const opening = parseFloat(data.openingStock) || 0;
      const saleValue = parseFloat(value) || 0;
      data.closingStock = (opening - saleValue).toString();
    }

    setProductData({
      ...productData,
      [productId]: data
    });
  };

  const addCreditEntry = () => {
    setCreditEntries([...creditEntries, { creditHolderId: '', amount: '' }]);
  };

  const updateCreditEntry = (index, field, value) => {
    const updated = [...creditEntries];
    updated[index][field] = value;
    setCreditEntries(updated);
  };

  const removeCreditEntry = (index) => {
    setCreditEntries(creditEntries.filter((_, i) => i !== index));
  };

  const setProductToZero = (productId) => {
    setProductData({
      ...productData,
      [productId]: {
        ...productData[productId],
        closingStock: productData[productId].openingStock.toString(),
        sale: '0'
      }
    });
  };

  const filteredProducts = products.filter(product => {
    // Search filter
    const matchesSearch = product.product_name.toLowerCase().includes(searchQuery.toLowerCase());

    // Hide empty filter
    const hasData = hideEmpty
      ? (productData[product.id]?.closingStock || productData[product.id]?.sale)
      : true;

    return matchesSearch && hasData;
  });

  const checkDateAvailability = async (selectedDate) => {
    setDateError('');

    if (!selectedDate) return;

    try {
      const response = await api.get('/sales');
      const userSales = response.data.filter(sale => sale.user_id);

      const existingSale = userSales.find(sale => {
        if (!sale.date) return false;

        // Parse the date from database and convert to local date string
        const dbDate = new Date(sale.date);
        const dbDateLocal = new Date(dbDate.getTime() - (dbDate.getTimezoneOffset() * 60000));
        const dbDateStr = dbDateLocal.toISOString().split('T')[0];

        return dbDateStr === selectedDate;
      });

      if (existingSale) {
        setDateError('Sale already exists for this date! Please select a different date. | इस तारीख के लिए बिक्री पहले से मौजूद है! कृपया अलग तारीख चुनें।');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error checking date availability:', err);
      return true; // Allow proceeding if check fails
    }
  };

  const handleDateChange = async (newDate) => {
    setSaleDate(newDate);
    await checkDateAvailability(newDate);
  };


  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleSubmit = async () => {
    // Final check for duplicate sale before submission using local time
    try {
      const response = await api.get('/sales');
      const userSales = response.data.filter(sale => sale.user_id);

      const existingSale = userSales.find(sale => {
        if (!sale.date) return false;

        // Parse database date to local date string
        const dbDate = new Date(sale.date);
        const dbYear = dbDate.getFullYear();
        const dbMonth = String(dbDate.getMonth() + 1).padStart(2, '0');
        const dbDay = String(dbDate.getDate()).padStart(2, '0');
        const dbDateStr = `${dbYear}-${dbMonth}-${dbDay}`;

        return dbDateStr === saleDate;
      });

      if (existingSale) {
        alert('❌ Sale already exists for this date. Cannot submit duplicate.\n\nइस तारीख के लिए बिक्री पहले से मौजूद है। डुप्लिकेट सबमिट नहीं कर सकते।');
        return;
      }
    } catch (err) {
      console.error('Error checking for duplicates:', err);
      alert('❌ Failed to verify duplicate. Please try again.\n\nडुप्लिकेट सत्यापित करने में विफल। कृपया पुनः प्रयास करें।');
      return;
    }

    try {
      // Prepare opening stock, closing stock and sale data using product IDs
      // Opening stock is from inventory (already loaded in frontend)
      const openingStockData = [];
      const closingStockData = [];
      const saleData = [];

      products.forEach(product => {
        const data = productData[product.id];

        // Store opening stock (from inventory)
        if (data.openingStock !== '' && data.openingStock !== null && data.openingStock !== undefined) {
          openingStockData.push({
            product_id: product.id,
            opening_stock: parseFloat(data.openingStock) || 0
          });
        }

        // Store closing stock if provided
        if (data.closingStock !== '' && data.closingStock !== null && data.closingStock !== undefined) {
          closingStockData.push({
            product_id: product.id,
            closing_stock: parseFloat(data.closingStock) || 0
          });
        }

        // Store sale if provided
        if (data.sale !== '' && data.sale !== null && data.sale !== undefined) {
          saleData.push({
            product_id: product.id,
            sale: parseFloat(data.sale) || 0
          });
        }
      });

      console.log('Opening Stock Data (from inventory):', openingStockData);
      console.log('Closing Stock Data:', closingStockData);
      console.log('Sale Data:', saleData);

      // Prepare credit data using credit holder IDs
      const creditData = [];
      creditEntries.forEach(entry => {
        if (entry.creditHolderId && entry.amount) {
          creditData.push({
            credit_holder_id: entry.creditHolderId,
            creditgiven: parseFloat(entry.amount)
          });
        }
      });

      const payload = {
        date: saleDate,
        openingStock: openingStockData.length > 0 ? openingStockData : null,
        closingStock: closingStockData.length > 0 ? closingStockData : null,
        sale: saleData.length > 0 ? saleData : null,
        cashCollected: parseFloat(cashCollected) || 0,
        upi: parseFloat(upiCollected) || 0,
        credit: creditData.length > 0 ? creditData : null,
        remarks: remarks || null
      };

      console.log('=== SUBMITTING PAYLOAD ===');
      console.log(JSON.stringify(payload, null, 2));

      await api.post('/sales', payload);

      // Show success message and redirect
      alert('✅ Sales report submitted successfully!\n\nबिक्री रिपोर्ट सफलतापूर्वक सबमिट की गई!');
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to submit sale';
      alert(`❌ ${errorMessage}\n\nबिक्री सबमिट करने में विफल`);
    }
  };

  if (loading) {
    return <div className="container" style={{ marginTop: '2rem' }}>Loading... | लोड हो रहा है...</div>;
  }

  return (
    <>
      <div className="header">
        <div className="header-content">
          <div>
            <h1>Add Sales Report | बिक्री रिपोर्ट जोड़ें</h1>
            <p style={{ color: '#ccc', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Fill in the sales data for the day | दिन के लिए बिक्री डेटा भरें
            </p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Cancel | रद्द करें
          </button>
        </div>
      </div>

      <div className="container">
        {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* Date Selection */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#000', marginBottom: '1.5rem', fontWeight: '700' }}>
            Sale Date | बिक्री तारीख
          </h2>
          <div className="form-group">
            <input
              type="date"
              id="saleDate"
              className="form-control"
              value={saleDate}
              onChange={(e) => handleDateChange(e.target.value)}
              min={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              max={new Date().toISOString().split('T')[0]}
              style={{
                fontSize: '1.25rem',
                widows: '100%',
                overflow: 'hidden',
                borderColor: dateError ? '#dc3545' : '#e0e0e0',
                borderWidth: dateError ? '3px' : '2px'
              }}
              required
            />
          </div>

          {dateError && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#000',
              color: 'white',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '1rem'
            }}>
              ⚠️ {dateError}
            </div>
          )}

          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
              You can only select dates from the last 7 days up to today.<br/>
              आप केवल पिछले 7 दिनों से आज तक की तारीखें चुन सकते हैं।
            </p>
          </div>
        </div>

        {/* Products Table */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#000', marginBottom: '1.5rem', fontWeight: '700' }}>
            Product Sales | उत्पाद बिक्री
          </h2>

          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
              Opening stock is from inventory. Enter either Closing Stock OR Sale, the other will auto-calculate.<br/>
              प्रारंभिक स्टॉक इन्वेंटरी से है। समापन स्टॉक या बिक्री दर्ज करें, दूसरा स्वतः गणना होगा।
            </p>
          </div>

          {/* Search and Filter Controls */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search
                  size={20}
                  style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#666',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search products... | उत्पाद खोजें..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    fontSize: '1.125rem',
                    padding: '1rem 1rem 1rem 3rem',
                    borderWidth: '2px'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666',
                      borderRadius: '4px'
                    }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <input
                type="checkbox"
                id="hideEmpty"
                checked={hideEmpty}
                onChange={(e) => setHideEmpty(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <label htmlFor="hideEmpty" style={{ margin: 0, fontSize: '1rem', cursor: 'pointer', userSelect: 'none' }}>
                Hide products without data | खाली उत्पाद छुपाएं
              </label>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #4caf50' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#2e7d32', fontWeight: '600' }}>
                Showing {filteredProducts.length} of {products.length} products | {filteredProducts.length} में से {products.length} उत्पाद दिखाए जा रहे हैं
              </p>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="table-container desktop-only" style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ minWidth: '150px' }}>Product | उत्पाद</th>
                  <th style={{ minWidth: '120px' }}>Closing Stock<br/>समापन स्टॉक</th>
                  <th style={{ minWidth: '120px' }}>Sale<br/>बिक्री</th>
                  <th style={{ minWidth: '120px' }}>Opening Stock<br/>प्रारंभिक स्टॉक</th>
                  <th style={{ minWidth: '100px' }}>Actions<br/>क्रियाएं</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product.id}>
                    <td style={{ fontWeight: '600' }}>{product.product_name}</td>
                    <td>
                      <input
                        type="number"
                        className="form-control"
                        value={productData[product.id].closingStock}
                        onChange={(e) => handleProductChange(product.id, 'closingStock', e.target.value)}
                        step="0.01"
                        min="0"
                        placeholder="0"
                        style={{
                          borderColor: productData[product.id].closingStock ? '#28a745' : '#e0e0e0',
                          borderWidth: '2px'
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control"
                        value={productData[product.id].sale}
                        onChange={(e) => handleProductChange(product.id, 'sale', e.target.value)}
                        step="0.01"
                        min="0"
                        placeholder="0"
                        style={{
                          borderColor: productData[product.id].sale ? '#28a745' : '#e0e0e0',
                          borderWidth: '2px'
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control"
                        value={productData[product.id].openingStock}
                        readOnly
                        style={{
                          backgroundColor: '#e9ecef',
                          cursor: 'not-allowed',
                          fontWeight: '700',
                          color: '#000',
                          textAlign: 'center'
                        }}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setProductToZero(product.id)}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
                      >
                        Zero
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="mobile-only">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                style={{
                  marginBottom: '1rem',
                  padding: '1.25rem',
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  backgroundColor: '#fff'
                }}
              >
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#000' }}>
                  {product.product_name}
                </h3>

                <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                    Opening Stock | प्रारंभिक स्टॉक
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#000' }}>
                    {productData[product.id].openingStock}
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Closing Stock | समापन स्टॉक
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={productData[product.id].closingStock}
                    onChange={(e) => handleProductChange(product.id, 'closingStock', e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="Enter closing stock"
                    style={{
                      fontSize: '1.25rem',
                      padding: '1rem',
                      borderColor: productData[product.id].closingStock ? '#28a745' : '#e0e0e0',
                      borderWidth: '2px'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Sale | बिक्री
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={productData[product.id].sale}
                    onChange={(e) => handleProductChange(product.id, 'sale', e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="Enter sale"
                    style={{
                      fontSize: '1.25rem',
                      padding: '1rem',
                      borderColor: productData[product.id].sale ? '#28a745' : '#e0e0e0',
                      borderWidth: '2px'
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setProductToZero(product.id)}
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    fontSize: '1.125rem',
                    padding: '1rem',
                    marginTop: '0.5rem'
                  }}
                >
                  Set to Zero | शून्य पर सेट करें
                </button>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '1.125rem', color: '#666' }}>
                No products found. Try adjusting your search or filters.<br/>
                कोई उत्पाद नहीं मिला। अपनी खोज या फ़िल्टर समायोजित करने का प्रयास करें।
              </p>
            </div>
          )}
        </div>

        {/* Cash & UPI Collection */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#000', marginBottom: '1.5rem', fontWeight: '700' }}>
            Cash & UPI Collection | नकद और UPI संग्रह
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group">
              <label htmlFor="cashCollected" style={{fontSize: '1rem'}}>Cash Collected | नकद एकत्रित</label>
              <input
                type="number"
                id="cashCollected"
                className="form-control"
                value={cashCollected}
                onChange={(e) => setCashCollected(e.target.value)}
                style={{ fontSize: '1.25rem', padding: '1.25rem' }}
                step="0.01"
                min="0"
                placeholder="₹ 0.00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="upiCollected" style={{fontSize: '1rem'}}>UPI Collected | UPI एकत्रित</label>
              <input
                type="number"
                id="upiCollected"
                className="form-control"
                value={upiCollected}
                onChange={(e) => setUpiCollected(e.target.value)}
                style={{ fontSize: '1.25rem', padding: '1.25rem' }}
                step="0.01"
                min="0"
                placeholder="₹ 0.00"
              />
            </div>
          </div>
        </div>

        {/* Credit */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#000', marginBottom: '1.5rem', fontWeight: '700' }}>
            Credit Given | उधार दिया गया
          </h2>

          {creditHolders.length === 0 && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fff3cd', border: '2px solid #ffc107', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '1rem', color: '#856404' }}>
                No credit holders found. Please ask your admin to add credit holders first.<br/>
                कोई उधार धारक नहीं मिला। कृपया अपने व्यवस्थापक से उधार धारक जोड़ने के लिए कहें।
              </p>
            </div>
          )}

          {creditEntries.map((entry, index) => (
            <div key={index} style={{ marginBottom: '1.5rem', padding: '1.5rem', border: '2px solid #e0e0e0', borderRadius: '8px', background: '#f9f9f9' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Credit Holder | उधार धारक</label>
                  <select
                    className="form-control"
                    value={entry.creditHolderId}
                    onChange={(e) => updateCreditEntry(index, 'creditHolderId', e.target.value)}
                    style={{ fontSize: '1.125rem', padding: '0.875rem' }}
                  >
                    <option value="">Select | चुनें</option>
                    {creditHolders.map(ch => (
                      <option key={ch.id} value={ch.id}>{ch.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Amount | राशि</label>
                  <input
                    type="number"
                    className="form-control"
                    value={entry.amount}
                    onChange={(e) => updateCreditEntry(index, 'amount', e.target.value)}
                    style={{ fontSize: '1.125rem', padding: '0.875rem' }}
                    step="0.01"
                    min="0"
                    placeholder="₹ 0.00"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeCreditEntry(index)}
                  className="btn btn-danger"
                  style={{ padding: '0.875rem 1.5rem' }}
                >
                  Remove | हटाएं
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addCreditEntry}
            className="btn btn-success"
            style={{ width: '100%', fontSize: '1.125rem', padding: '1rem' }}
          >
            + Add Credit | उधार जोड़ें
          </button>
        </div>

        {/* Remarks */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#000', marginBottom: '1.5rem', fontWeight: '700' }}>
            Remarks | टिप्पणियाँ
          </h2>

          <div className="form-group">
            <textarea
              id="remarks"
              className="form-control"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{ fontSize: '1.125rem', padding: '1.25rem' }}
              rows="4"
              placeholder="Enter any remarks (optional) | कोई टिप्पणी दर्ज करें (वैकल्पिक)"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="card">
          <button
            onClick={handlePreview}
            className="btn btn-success"
            disabled={dateError}
            style={{
              width: '100%',
              fontSize: '1.5rem',
              padding: '1.5rem',
              fontWeight: '700',
              opacity: dateError ? 0.5 : 1,
              cursor: dateError ? 'not-allowed' : 'pointer'
            }}
          >
            Preview & Submit | पूर्वावलोकन और सबमिट करें
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Confirm Sales Report | रिपोर्ट की पुष्टि करें</h2>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Date */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>Date | तारीख</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#000' }}>
                {new Date(saleDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>

            {/* Products Summary */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem', color: '#000' }}>
                Products Sold | बेचे गए उत्पाद
              </h3>
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '2px solid #e0e0e0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#000', color: 'white' }}>
                    <tr>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem' }}>Product</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem' }}>Sale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products
                      .filter(product => productData[product.id]?.sale && parseFloat(productData[product.id].sale) > 0)
                      .map((product, index) => (
                        <tr key={product.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                          <td style={{ padding: '0.75rem', fontWeight: '600' }}>{product.product_name}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '700', color: '#2e7d32' }}>
                            {parseFloat(productData[product.id].sale).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    {products.filter(product => productData[product.id]?.sale && parseFloat(productData[product.id].sale) > 0).length === 0 && (
                      <tr>
                        <td colSpan="2" style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                          No sales recorded | कोई बिक्री दर्ज नहीं
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cash & UPI */}
            <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #4caf50' }}>
                <div style={{ fontSize: '0.875rem', color: '#2e7d32', marginBottom: '0.25rem' }}>Cash | नकद</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1b5e20' }}>
                  ₹{parseFloat(cashCollected || 0).toFixed(2)}
                </div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #2196f3' }}>
                <div style={{ fontSize: '0.875rem', color: '#1565c0', marginBottom: '0.25rem' }}>UPI</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0d47a1' }}>
                  ₹{parseFloat(upiCollected || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Total Collection */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fff3e0', borderRadius: '8px', border: '2px solid #ff9800' }}>
              <div style={{ fontSize: '0.875rem', color: '#e65100', marginBottom: '0.25rem' }}>
                Total Collection | कुल संग्रह
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#e65100' }}>
                ₹{(parseFloat(cashCollected || 0) + parseFloat(upiCollected || 0)).toFixed(2)}
              </div>
            </div>

            {/* Credit */}
            {creditEntries.filter(e => e.creditHolderId && e.amount).length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem', color: '#000' }}>
                  Credit Given | उधार दिया गया
                </h3>
                <div style={{ border: '2px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                  {creditEntries
                    .filter(entry => entry.creditHolderId && entry.amount)
                    .map((entry, index) => {
                      const holder = creditHolders.find(ch => ch.id === entry.creditHolderId);
                      return (
                        <div
                          key={index}
                          style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span style={{ fontWeight: '600' }}>{holder?.name || 'Unknown'}</span>
                          <span style={{ fontWeight: '700', color: '#dc3545' }}>
                            ₹{parseFloat(entry.amount).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                </div>
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#ffebee', borderRadius: '8px', textAlign: 'right' }}>
                  <span style={{ fontSize: '0.875rem', color: '#c62828', marginRight: '0.5rem' }}>Total Credit:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#c62828' }}>
                    ₹{creditEntries
                      .filter(e => e.creditHolderId && e.amount)
                      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Remarks */}
            {remarks && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>Remarks | टिप्पणियाँ</div>
                <div style={{ fontSize: '1rem', color: '#000', whiteSpace: 'pre-wrap' }}>{remarks}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={() => setShowPreview(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Edit | संपादित करें
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  handleSubmit();
                }}
                className="btn btn-success"
                style={{ flex: 1 }}
              >
                Confirm & Submit | पुष्टि करें और सबमिट करें
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddSales;
