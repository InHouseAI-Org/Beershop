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
  const [upiTotal, setUpiTotal] = useState('');
  const [miscellaneousCash, setMiscellaneousCash] = useState('');
  const [miscellaneousUPI, setMiscellaneousUPI] = useState('');
  const [creditEntries, setCreditEntries] = useState([]);
  const [creditTaken, setCreditTaken] = useState([]);
  const [dailyExpenses, setDailyExpenses] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [dateError, setDateError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideEmpty, setHideEmpty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [galaBalanceYesterday, setGalaBalanceYesterday] = useState(0);
  const [lastSalesReportDate, setLastSalesReportDate] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, creditHoldersRes, inventoryRes, balancesRes, salesRes] = await Promise.all([
        api.get('/products'),
        api.get('/credit-holders'),
        api.get('/inventory'),
        api.get('/balances/organisation'),
        api.get('/sales')
      ]);

      setProducts(productsRes.data);
      setCreditHolders(creditHoldersRes.data);

      // Find the last sales report date (consider both approved and pending)
      const allSales = salesRes.data; // All sales regardless of status
      if (allSales.length > 0) {
        // Sort by date descending and get the latest
        const sortedSales = allSales.sort((a, b) => new Date(b.date) - new Date(a.date));
        const lastSale = sortedSales[0];
        const lastDate = new Date(lastSale.date);
        lastDate.setHours(0, 0, 0, 0);
        setLastSalesReportDate(lastDate);
      }

      // Get current gala balance from organisation (this is the actual balance in gala)
      if (balancesRes.data) {
        setGalaBalanceYesterday(parseFloat(balancesRes.data.galaBalance || 0));
      }

      // Initialize product data with opening stock from inventory
      const initialData = {};
      productsRes.data.forEach(product => {
        // Find inventory for this product
        const inventoryItem = inventoryRes.data.find(inv => inv.product_id === product.id);
        const openingQty = inventoryItem ? (inventoryItem.qty || 0) : 0;

        initialData[product.id] = {
          openingStock: openingQty,
          closingStock: openingQty,
          sale: 0
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
    console.log('🔵 addCreditEntry called, current entries:', creditEntries);
    const newEntries = [...creditEntries, { creditHolderId: '', amount: '' }];
    console.log('🔵 Setting new entries:', newEntries);
    setCreditEntries(newEntries);
  };

  const updateCreditEntry = (index, field, value) => {
    console.log('🔵 updateCreditEntry called:', { index, field, value });
    const updated = [...creditEntries];
    updated[index][field] = value;
    console.log('🔵 Updated entries:', updated);
    setCreditEntries(updated);
  };

  const removeCreditEntry = (index) => {
    console.log('🔵 removeCreditEntry called:', index);
    const filtered = creditEntries.filter((_, i) => i !== index);
    console.log('🔵 After removal:', filtered);
    setCreditEntries(filtered);
  };

  // Credit Collected handlers
  const addCreditTaken = () => {
    console.log('🟢 addCreditTaken called, current entries:', creditTaken);
    const newEntries = [...creditTaken, { creditHolderId: '', amount: '', collectedIn: 'cash_balance' }];
    console.log('🟢 Setting new entries:', newEntries);
    setCreditTaken(newEntries);
  };

  const updateCreditTaken = (index, field, value) => {
    console.log('🟢 updateCreditTaken called:', { index, field, value });
    const updated = [...creditTaken];
    updated[index][field] = value;
    console.log('🟢 Updated entries:', updated);
    setCreditTaken(updated);
  };

  const removeCreditTaken = (index) => {
    console.log('🟢 removeCreditTaken called:', index);
    const filtered = creditTaken.filter((_, i) => i !== index);
    console.log('🟢 After removal:', filtered);
    setCreditTaken(filtered);
  };

  // Daily Expenses handlers
  const addDailyExpense = () => {
    setDailyExpenses([...dailyExpenses, { name: '', description: '', amount: '' }]);
  };

  const updateDailyExpense = (index, field, value) => {
    const updated = [...dailyExpenses];
    updated[index][field] = value;
    setDailyExpenses(updated);
  };

  const removeDailyExpense = (index) => {
    setDailyExpenses(dailyExpenses.filter((_, i) => i !== index));
  };

  // Calculate totals and derived values
  const calculateTotals = () => {
    // Total sales from products
    const totalSales = products.reduce((sum, product) => {
      return sum + ((parseFloat(productData[product.id]?.sale) || 0) * (parseFloat(product.sale_price) || 0));
    }, 0);

    // Credit given total
    const totalCreditGiven = creditEntries.reduce((sum, entry) => {
      return sum + (entry.creditHolderId && entry.amount ? parseFloat(entry.amount) : 0);
    }, 0);

    // Credit collected by type
    const creditTakenCash = creditTaken
      .filter(c => c.collectedIn === 'cash_balance')
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

    const creditTakenUPI = creditTaken
      .filter(c => c.collectedIn === 'bank_balance')
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

    // Misc by type
    const miscCash = parseFloat(miscellaneousCash || 0);
    const miscUPI = parseFloat(miscellaneousUPI || 0);

    // Expenses total
    const totalExpenses = dailyExpenses.reduce((sum, expense) => {
      return sum + (parseFloat(expense.amount) || 0);
    }, 0);

    // UPI Total from user input
    const upiTotalValue = parseFloat(upiTotal || 0);

    // Core calculations
    const upiSales = Math.max(0, upiTotalValue - creditTakenUPI - miscUPI);
    const cashSales = Math.max(0, totalSales - upiSales + miscCash );
    const cashCollected = Math.max(0, cashSales + creditTakenCash - totalCreditGiven - totalExpenses);
    return {
      totalSales,
      totalCreditGiven,
      creditTakenCash,
      creditTakenUPI,
      miscCash,
      miscUPI,
      totalExpenses,
      upiSales,
      cashSales,
      cashCollected
    };
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
    console.log('🚀 handleSubmit called');
    console.log('📊 Current state at submission:');
    console.log('  creditEntries:', creditEntries);
    console.log('  creditTaken:', creditTaken);
    console.log('  dailyExpenses:', dailyExpenses);

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
      console.log('=== PREPARING CREDIT GIVEN DATA ===');
      console.log('creditEntries:', creditEntries);
      const creditData = [];
      creditEntries.forEach(entry => {
        console.log('Processing credit entry:', entry);
        if (entry.creditHolderId && entry.amount) {
          creditData.push({
            credit_holder_id: entry.creditHolderId,  // Keep as UUID string
            creditgiven: parseFloat(entry.amount)
          });
          console.log('Added to creditData:', { credit_holder_id: entry.creditHolderId, creditgiven: parseFloat(entry.amount) });
        } else {
          console.log('Skipping entry - missing creditHolderId or amount');
        }
      });
      console.log('Final creditData:', creditData);

      // Get calculated values
      const totals = calculateTotals();

      // Prepare credit Collected data
      console.log('=== PREPARING CREDIT Collected DATA ===');
      console.log('creditTaken:', creditTaken);
      const creditTakenData = creditTaken
        .filter(ct => ct.creditHolderId && ct.amount)
        .map(ct => {
          console.log('Processing credit Collected:', ct);
          return {
            creditHolderId: ct.creditHolderId,  // Keep as UUID string
            amount: parseFloat(ct.amount),
            collectedIn: ct.collectedIn
          };
        });
      console.log('Final creditTakenData:', creditTakenData);

      // Prepare daily expenses data
      const expensesData = dailyExpenses
        .filter(exp => exp.name && exp.amount)
        .map(exp => ({
          name: exp.name,
          description: exp.description || '',
          amount: parseFloat(exp.amount)
        }));

      const payload = {
        date: saleDate,
        openingStock: openingStockData.length > 0 ? openingStockData : null,
        closingStock: closingStockData.length > 0 ? closingStockData : null,
        sale: saleData.length > 0 ? saleData : null,
        cashCollected: totals.cashCollected,
        upi: parseFloat(upiTotal) || 0,
        miscellaneous: (parseFloat(miscellaneousCash || 0) + parseFloat(miscellaneousUPI || 0)),
        miscellaneousType: 'both', // Keeping for backward compatibility, but frontend now tracks both separately
        miscellaneousCash: parseFloat(miscellaneousCash) || 0,
        miscellaneousUPI: parseFloat(miscellaneousUPI) || 0,
        credit: creditData.length > 0 ? creditData : null,
        creditTaken: creditTakenData.length > 0 ? creditTakenData : null,
        dailyExpenses: expensesData.length > 0 ? expensesData : null,
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
              min={(() => {
                if (!lastSalesReportDate) {
                  // If no last report, allow today minus 30 days
                  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                }
                // Allow from day after last report
                const minDate = new Date(lastSalesReportDate);
                minDate.setDate(minDate.getDate() + 1);
                return minDate.toISOString().split('T')[0];
              })()}
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
              {lastSalesReportDate ? (
                <>
                  You can select dates from {(() => {
                    const minDate = new Date(lastSalesReportDate);
                    minDate.setDate(minDate.getDate() + 1);
                    return minDate.toLocaleDateString();
                  })()} to {new Date().toLocaleDateString()}.<br/>
                  आप {(() => {
                    const minDate = new Date(lastSalesReportDate);
                    minDate.setDate(minDate.getDate() + 1);
                    return minDate.toLocaleDateString();
                  })()} से {new Date().toLocaleDateString()} तक की तारीखें चुन सकते हैं।
                </>
              ) : (
                <>
                  You can select dates from the last 30 days up to today.<br/>
                  आप पिछले 30 दिनों से आज तक की तारीखें चुन सकते हैं।
                </>
              )}
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
                  <th style={{ minWidth: '120px' }}>Sale Value<br/>बिक्री मूल्य</th>
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
                        step="1"
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
                        step="1"
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
                    <td style={{
                      fontWeight: '700',
                      color: '#2e7d32',
                      fontSize: '1.125rem',
                      textAlign: 'center'
                    }}>
                      ₹{((parseFloat(productData[product.id].sale) || 0) * (parseFloat(product.sale_price) || 0)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#fff3e0', fontWeight: '700' }}>
                  <td colSpan="4" style={{ textAlign: 'right', padding: '1rem', fontSize: '1.125rem', color: '#e65100' }}>
                    Total Sale Value | कुल बिक्री मूल्य
                  </td>
                  <td style={{ textAlign: 'center', padding: '1rem', fontSize: '1.25rem', color: '#e65100' }}>
                    ₹{filteredProducts.reduce((total, product) => {
                      const saleValue = (parseFloat(productData[product.id].sale) || 0) * (parseFloat(product.sale_price) || 0);
                      return total + saleValue;
                    }, 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
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
                    step="1"
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
                    step="1"
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

                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #4caf50' }}>
                  <div style={{ fontSize: '0.875rem', color: '#2e7d32', marginBottom: '0.25rem' }}>
                    Sale Value | बिक्री मूल्य
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1b5e20' }}>
                    ₹{((parseFloat(productData[product.id].sale) || 0) * (parseFloat(product.sale_price) || 0)).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Sale Value for Mobile */}
          {filteredProducts.length > 0 && (
            <div className="mobile-only" style={{ marginTop: '1.5rem', padding: '1.25rem', backgroundColor: '#fff3e0', borderRadius: '12px', border: '2px solid #ff9800' }}>
              <div style={{ fontSize: '1rem', color: '#e65100', marginBottom: '0.5rem', fontWeight: '600' }}>
                Total Sale Value | कुल बिक्री मूल्य
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#e65100' }}>
                ₹{filteredProducts.reduce((total, product) => {
                  const saleValue = (parseFloat(productData[product.id].sale) || 0) * (parseFloat(product.sale_price) || 0);
                  return total + saleValue;
                }, 0).toFixed(2)}
              </div>
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '1.125rem', color: '#666' }}>
                No products found. Try adjusting your search or filters.<br/>
                कोई उत्पाद नहीं मिला। अपनी खोज या फ़िल्टर समायोजित करने का प्रयास करें।
              </p>
            </div>
          )}
        </div>


        {/* Miscellaneous */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#000', marginBottom: '1.5rem', fontWeight: '700' }}>
            Extra (Chakhna, Bag, etc) | अतिरिक्त
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group">
              <label htmlFor="miscellaneousCash" style={{fontSize: '1rem'}}>Cash</label>
              <input
                type="number"
                id="miscellaneousCash"
                className="form-control"
                value={miscellaneousCash}
                onChange={(e) => setMiscellaneousCash(e.target.value)}
                style={{ fontSize: '1.25rem', padding: '1.25rem' }}
                step="1"
                min="0"
                placeholder="₹ 0.00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="miscellaneousUPI" style={{fontSize: '1rem'}}>UPI</label>
              <input
                type="number"
                id="miscellaneousUPI"
                className="form-control"
                value={miscellaneousUPI}
                onChange={(e) => setMiscellaneousUPI(e.target.value)}
                style={{ fontSize: '1.25rem', padding: '1.25rem' }}
                step="1"
                min="0"
                placeholder="₹ 0.00"
              />
            </div>
          </div>
        </div>

        {/* Credit Collected (Collect on Shop) */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#000', marginBottom: '1.5rem', fontWeight: '700' }}>
            Credit Collected (Collect on Shop) | उधार वसूली (दुकान पर)
          </h2>


          {creditHolders.length === 0 && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fff3cd', border: '2px solid #ffc107', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '1rem', color: '#856404' }}>
                No credit holders found. Please ask your admin to add credit holders first.<br/>
                कोई उधार धारक नहीं मिला। कृपया अपने व्यवस्थापक से उधार धारक जोड़ने के लिए कहें।
              </p>
            </div>
          )}

          {creditTaken.map((entry, index) => {
            const selectedHolder = creditHolders.find(ch => String(ch.id) === String(entry.creditHolderId));
            const currentOutstanding = selectedHolder ? parseFloat(selectedHolder.amount_payable || 0) : 0;
            const amountCollecting = parseFloat(entry.amount || 0);
            const newOutstanding = Math.max(0, currentOutstanding - amountCollecting);

            return (
              <div key={index} style={{ marginBottom: '1.5rem', padding: '1.5rem', border: '2px solid #e0e0e0', borderRadius: '8px', background: '#f9f9f9' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Credit Holder | उधार धारक</label>
                    <select
                      className="form-control"
                      value={entry.creditHolderId}
                      onChange={(e) => updateCreditTaken(index, 'creditHolderId', e.target.value)}
                      style={{ fontSize: '1.125rem', padding: '0.875rem' }}
                    >
                      <option value="">Select | चुनें</option>
                      {creditHolders.map(ch => {
                        const isAlreadySelected = creditTaken.some((ct, ctIndex) =>
                          ctIndex !== index && String(ct.creditHolderId) === String(ch.id)
                        );
                        return (
                          <option key={ch.id} value={ch.id} disabled={isAlreadySelected}>
                            {ch.name}{isAlreadySelected ? ' (Already selected)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {entry.creditHolderId && (
                    <div style={{ padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #2196f3' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', color: '#1565c0', fontWeight: '600' }}>Current Outstanding | वर्तमान बकाया:</span>
                        <span style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0d47a1' }}>₹{currentOutstanding.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #90caf9' }}>
                        <span style={{ fontSize: '0.875rem', color: '#1565c0', fontWeight: '600' }}>Outstanding After Collection | वसूली के बाद बकाया:</span>
                        <span style={{ fontSize: '1.125rem', fontWeight: '700', color: '#2e7d32' }}>₹{newOutstanding.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Amount | राशि</label>
                    <input
                      type="number"
                      className="form-control"
                      value={entry.amount}
                      onChange={(e) => updateCreditTaken(index, 'amount', e.target.value)}
                      style={{ fontSize: '1.125rem', padding: '0.875rem' }}
                      step="1"
                      min="0"
                      placeholder="₹ 0.00"
                    />
                  </div>

                  <div className="form-group">
                    <label>Collected In | में एकत्रित</label>
                    <select
                      className="form-control"
                      value={entry.collectedIn}
                      onChange={(e) => updateCreditTaken(index, 'collectedIn', e.target.value)}
                      style={{ fontSize: '1.125rem', padding: '0.875rem' }}
                    >
                      <option value="cash_balance">Cash | नकद</option>
                      <option value="bank_balance">UPI</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCreditTaken(index)}
                    className="btn btn-danger"
                    style={{ padding: '0.875rem 1.5rem' }}
                  >
                    Remove | हटाएं
                  </button>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addCreditTaken}
            className="btn btn-success"
            style={{ width: '100%', fontSize: '1.125rem', padding: '1rem' }}
          >
            + Add Credit Collected | उधार वसूली जोड़ें
          </button>
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

          {creditEntries.map((entry, index) => {
            const selectedHolder = creditHolders.find(ch => String(ch.id) === String(entry.creditHolderId));
            const currentOutstanding = selectedHolder ? parseFloat(selectedHolder.amount_payable || 0) : 0;
            const amountGiving = parseFloat(entry.amount || 0);
            const newOutstanding = currentOutstanding + amountGiving;

            return (
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
                      {creditHolders.map(ch => {
                        const isAlreadySelected = creditEntries.some((ce, ceIndex) =>
                          ceIndex !== index && String(ce.creditHolderId) === String(ch.id)
                        );
                        return (
                          <option key={ch.id} value={ch.id} disabled={isAlreadySelected}>
                            {ch.name}{isAlreadySelected ? ' (Already selected)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {entry.creditHolderId && (
                    <div style={{ padding: '1rem', backgroundColor: '#fff3e0', borderRadius: '8px', border: '1px solid #ff9800' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', color: '#e65100', fontWeight: '600' }}>Current Outstanding | वर्तमान बकाया:</span>
                        <span style={{ fontSize: '1.125rem', fontWeight: '700', color: '#e65100' }}>₹{currentOutstanding.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #ffb74d' }}>
                        <span style={{ fontSize: '0.875rem', color: '#e65100', fontWeight: '600' }}>Outstanding After Giving Credit | उधार देने के बाद बकाया:</span>
                        <span style={{ fontSize: '1.125rem', fontWeight: '700', color: '#d32f2f' }}>₹{newOutstanding.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Amount | राशि</label>
                    <input
                      type="number"
                      className="form-control"
                      value={entry.amount}
                      onChange={(e) => updateCreditEntry(index, 'amount', e.target.value)}
                      style={{ fontSize: '1.125rem', padding: '0.875rem' }}
                      step="1"
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
            );
          })}

          <button
            type="button"
            onClick={addCreditEntry}
            className="btn btn-success"
            style={{ width: '100%', fontSize: '1.125rem', padding: '1rem' }}
          >
            + Add Credit | उधार जोड़ें
          </button>
        </div>

        {/* UPI & Gala Balance */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#000', marginBottom: '1.5rem', fontWeight: '700' }}>
            UPI Collection | UPI संग्रह 
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group">
              <label htmlFor="upiTotal" style={{fontSize: '1rem'}}>Total UPI Received Today | आज कुल UPI प्राप्त</label>
              <input
                type="number"
                id="upiTotal"
                className="form-control"
                value={upiTotal}
                onChange={(e) => setUpiTotal(e.target.value)}
                style={{ fontSize: '1.25rem', padding: '1.25rem' }}
                step="1"
                min="0"
                placeholder="₹ 0.00"
              />
            </div>


            <div style={{ padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#1565c0' }}>
                Current Gala Balance (Opening): ₹{galaBalanceYesterday.toFixed(2)}<br/>
                वर्तमान गल्ला बैलेंस (प्रारंभिक): ₹{galaBalanceYesterday.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Daily Expenses */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#000', marginBottom: '1.5rem', fontWeight: '700' }}>
            Daily Expenses (From Gala) | दैनिक खर्चे (गल्ले से)
          </h2>

          {/* Expense Validation */}
          {(() => {
            const totals = calculateTotals();
            const totalExpenses = dailyExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
            const maxAllowed = Math.max(0,galaBalanceYesterday + totals.cashSales + totals.creditTakenCash - totals.totalCreditGiven);
            const isExceeding = totalExpenses > maxAllowed;

            return (
              <div style={{
                marginBottom: '1.5rem',
                padding: '1.5rem',
                backgroundColor: isExceeding ? '#f8d7da' : '#e3f2fd',
                borderRadius: '12px',
                border: `2px solid ${isExceeding ? '#dc3545' : '#2196f3'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.875rem', color: isExceeding ? '#721c24' : '#1565c0', fontWeight: '600' }}>
                    Available Funds (Gala + Cash Sales + Credit Collected Cash - Credit Given) | उपलब्ध धनराशि:
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: isExceeding ? '#721c24' : '#0d47a1' }}>
                    ₹{maxAllowed.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: `1px solid ${isExceeding ? '#f5c6cb' : '#90caf9'}` }}>
                  <span style={{ fontSize: '0.875rem', color: isExceeding ? '#721c24' : '#1565c0', fontWeight: '600' }}>
                    Total Expenses | कुल खर्चे:
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: isExceeding ? '#dc3545' : '#2e7d32' }}>
                    ₹{totalExpenses.toFixed(2)}
                  </span>
                </div>
                {isExceeding && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#856404', fontWeight: '600' }}>
                      ⚠️ Warning: Total expenses exceed available funds by ₹{(totalExpenses - maxAllowed).toFixed(2)}!<br/>
                      चेतावनी: कुल खर्चे उपलब्ध धनराशि से अधिक हैं!
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          {dailyExpenses.map((expense, index) => (
            <div key={index} style={{ marginBottom: '1.5rem', padding: '1.5rem', border: '2px solid #e0e0e0', borderRadius: '8px', background: '#f9f9f9' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Name | नाम</label>
                  <input
                    type="text"
                    className="form-control"
                    value={expense.name}
                    onChange={(e) => updateDailyExpense(index, 'name', e.target.value)}
                    style={{ fontSize: '1.125rem', padding: '0.875rem' }}
                    placeholder="e.g., Electricity, Supplies"
                  />
                </div>

                <div className="form-group">
                  <label>Description (Optional) | विवरण (वैकल्पिक)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={expense.description}
                    onChange={(e) => updateDailyExpense(index, 'description', e.target.value)}
                    style={{ fontSize: '1.125rem', padding: '0.875rem' }}
                    placeholder="Additional details"
                  />
                </div>

                <div className="form-group">
                  <label>Amount | राशि</label>
                  <input
                    type="number"
                    className="form-control"
                    value={expense.amount}
                    onChange={(e) => updateDailyExpense(index, 'amount', e.target.value)}
                    style={{ fontSize: '1.125rem', padding: '0.875rem' }}
                    step="1"
                    min="0"
                    placeholder="₹ 0.00"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeDailyExpense(index)}
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
            onClick={addDailyExpense}
            className="btn btn-success"
            style={{ width: '100%', fontSize: '1.125rem', padding: '1rem' }}
          >
            + Add Expense | खर्चा जोड़ें
          </button>
        </div>

        {/* Calculated Values Display */}
        <div className="card" style={{ marginBottom: '2rem', backgroundColor: '#f8f9fa', borderWidth: '3px' }}>
          <h2 style={{ color: '#000', marginBottom: '1.5rem', fontWeight: '700' }}>
            Calculated Values | गणना किए गए मान
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '2px solid #4caf50' }}>
              <div style={{ fontSize: '0.875rem', color: '#2e7d32', marginBottom: '0.25rem' }}>UPI Sales | UPI बिक्री</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1b5e20' }}>
                ₹{Math.max(0, calculateTotals().upiSales).toFixed(2)}
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '2px solid #2196f3' }}>
              <div style={{ fontSize: '0.875rem', color: '#1565c0', marginBottom: '0.25rem' }}>Cash Sales | नकद बिक्री</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0d47a1' }}>
                ₹{Math.max(0,calculateTotals().cashSales.toFixed(2))}
              </div>
            </div>
          </div>

          <div style={{ padding: '1.5rem', backgroundColor: '#fff3e0', borderRadius: '8px', border: '3px solid #ff9800', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '1rem', color: '#e65100', marginBottom: '0.5rem', fontWeight: '600' }}>
              Cash Collected | नकद एकत्रित
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#e65100' }}>
              ₹{Math.max(0,calculateTotals().cashCollected.toFixed(2))}
            </div>
          </div>

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

            {/* Calculated Values */}
            <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '2px solid #4caf50' }}>
                <div style={{ fontSize: '0.875rem', color: '#2e7d32', marginBottom: '0.25rem' }}>Cash Sales | नकद बिक्री</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1b5e20' }}>
                  ₹{Math.max(0, calculateTotals().cashSales.toFixed(2))}
                </div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '2px solid #2196f3' }}>
                <div style={{ fontSize: '0.875rem', color: '#1565c0', marginBottom: '0.25rem' }}>UPI Sales | UPI बिक्री</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0d47a1' }}>
                  ₹{Math.max(0, calculateTotals().upiSales).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Cash Collected */}
            <div style={{ marginBottom: '1.5rem', padding: '1.5rem', backgroundColor: '#fff3e0', borderRadius: '8px', border: '3px solid #ff9800' }}>
              <div style={{ fontSize: '1rem', color: '#e65100', marginBottom: '0.5rem', fontWeight: '600' }}>
                Cash Collected | नकद एकत्रित
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#e65100' }}>
                ₹{calculateTotals().cashCollected.toFixed(2)}
              </div>
            </div>

            {/* UPI Total & Gala Balance */}
            <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#f3e5f5', borderRadius: '8px', border: '1px solid #9c27b0' }}>
                <div style={{ fontSize: '0.875rem', color: '#6a1b9a', marginBottom: '0.25rem' }}>UPI Total | कुल UPI</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4a148c' }}>
                  ₹{parseFloat(upiTotal || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Miscellaneous */}
            {((miscellaneousCash && parseFloat(miscellaneousCash) > 0) || (miscellaneousUPI && parseFloat(miscellaneousUPI) > 0)) && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem', color: '#000' }}>
                  Extra (Chakhna, Bag, etc) | अतिरिक्त
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {miscellaneousCash && parseFloat(miscellaneousCash) > 0 && (
                    <div style={{ padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #4caf50' }}>
                      <div style={{ fontSize: '0.875rem', color: '#2e7d32', marginBottom: '0.25rem' }}>Cash</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1b5e20' }}>
                        ₹{parseFloat(miscellaneousCash).toFixed(2)}
                      </div>
                    </div>
                  )}
                  {miscellaneousUPI && parseFloat(miscellaneousUPI) > 0 && (
                    <div style={{ padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #2196f3' }}>
                      <div style={{ fontSize: '0.875rem', color: '#1565c0', marginBottom: '0.25rem' }}>UPI</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0d47a1' }}>
                        ₹{parseFloat(miscellaneousUPI).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Credit Given */}
            {creditEntries.filter(e => e.creditHolderId && e.amount).length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem', color: '#000' }}>
                  Credit Given | उधार दिया गया
                </h3>
                <div style={{ border: '2px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                  {creditEntries
                    .filter(entry => entry.creditHolderId && entry.amount)
                    .map((entry, index) => {
                      const holder = creditHolders.find(ch => String(ch.id) === String(entry.creditHolderId));
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

            {/* Credit Collected */}
            {creditTaken.filter(e => e.creditHolderId && e.amount).length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem', color: '#000' }}>
                  Credit Collected (Collect on Shop) | उधार वसूली
                </h3>
                <div style={{ border: '2px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                  {creditTaken
                    .filter(entry => entry.creditHolderId && entry.amount)
                    .map((entry, index) => {
                      const holder = creditHolders.find(ch => String(ch.id) === String(entry.creditHolderId));
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
                          <div>
                            <div style={{ fontWeight: '600' }}>{holder?.name || 'Unknown'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#666' }}>
                              {entry.collectedIn === 'bank_balance' ? 'UPI' : 'Cash'}
                            </div>
                          </div>
                          <span style={{ fontWeight: '700', color: '#28a745' }}>
                            ₹{parseFloat(entry.amount).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                </div>
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#e8f5e9', borderRadius: '8px', textAlign: 'right' }}>
                  <span style={{ fontSize: '0.875rem', color: '#2e7d32', marginRight: '0.5rem' }}>Total Collected:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2e7d32' }}>
                    ₹{creditTaken
                      .filter(e => e.creditHolderId && e.amount)
                      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Daily Expenses */}
            {dailyExpenses.filter(e => e.name && e.amount).length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem', color: '#000' }}>
                  Daily Expenses | दैनिक खर्चे
                </h3>
                <div style={{ border: '2px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                  {dailyExpenses
                    .filter(expense => expense.name && expense.amount)
                    .map((expense, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '0.75rem 1rem',
                          backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: '600' }}>{expense.name}</span>
                          <span style={{ fontWeight: '700', color: '#ff9800' }}>
                            ₹{parseFloat(expense.amount).toFixed(2)}
                          </span>
                        </div>
                        {expense.description && (
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>
                            {expense.description}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#fff3e0', borderRadius: '8px', textAlign: 'right' }}>
                  <span style={{ fontSize: '0.875rem', color: '#e65100', marginRight: '0.5rem' }}>Total Expenses:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#e65100' }}>
                    ₹{dailyExpenses
                      .filter(e => e.name && e.amount)
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
