import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

const AddSales = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [creditHolders, setCreditHolders] = useState([]);
  const [inventory, setInventory] = useState([]);
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
      setInventory(inventoryRes.data);

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


  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit? | क्या आप सबमिट करना चाहते हैं?')) {
      return;
    }

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
        setError('Sale already exists for this date. Cannot submit duplicate. | इस तारीख के लिए बिक्री पहले से मौजूद है। डुप्लिकेट सबमिट नहीं कर सकते।');
        return;
      }
    } catch (err) {
      console.error('Error checking for duplicates:', err);
      setError('Failed to verify duplicate. Please try again. | डुप्लिकेट सत्यापित करने में विफल। कृपया पुनः प्रयास करें।');
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
      alert('Sales report submitted successfully! | बिक्री रिपोर्ट सफलतापूर्वक सबमिट की गई!');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit sale | बिक्री सबमिट करने में विफल');
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
                padding: '1.25rem',
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

          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ minWidth: '150px' }}>Product | उत्पाद</th>
                  <th style={{ minWidth: '120px' }}>Opening Stock<br/>प्रारंभिक स्टॉक</th>
                  <th style={{ minWidth: '120px' }}>Closing Stock<br/>समापन स्टॉक</th>
                  <th style={{ minWidth: '120px' }}>Sale<br/>बिक्री</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id}>
                    <td style={{ fontWeight: '600' }}>{product.product_name}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cash & UPI Collection */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#000', marginBottom: '1.5rem', fontWeight: '700' }}>
            Cash & UPI Collection | नकद और UPI संग्रह
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group">
              <label htmlFor="cashCollected">Cash Collected | नकद एकत्रित</label>
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
              <label htmlFor="upiCollected">UPI Collected | UPI एकत्रित</label>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
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
            onClick={handleSubmit}
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
            Submit Sales Report | बिक्री रिपोर्ट सबमिट करें
          </button>
        </div>
      </div>
    </>
  );
};

export default AddSales;
