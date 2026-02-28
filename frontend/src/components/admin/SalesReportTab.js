import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { Calendar, CreditCard, TrendingUp, User, X, FileText, Package, MessageSquare, Wallet, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';

const SalesReportTab = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMonth, setActiveMonth] = useState('');
  const [salesByMonth, setSalesByMonth] = useState({});
  const [pendingSalesList, setPendingSalesList] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [products, setProducts] = useState([]);
  const [creditHolders, setCreditHolders] = useState([]);

  // Approval state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalSale, setApprovalSale] = useState(null);
  const [approvalForm, setApprovalForm] = useState({});
  const [approvalError, setApprovalError] = useState('');

  // Balance allocation state
  const [allocatedBalances, setAllocatedBalances] = useState({});
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocationSale, setAllocationSale] = useState(null);
  const [allocationForm, setAllocationForm] = useState({
    cashBalance: '',
    bankBalance: '',
    galaBalance: ''
  });
  const [allocationError, setAllocationError] = useState('');

  const fetchAllocatedBalances = useCallback(async (salesData) => {
    try {
      const balancesResponse = await api.get('/balances');
      const balances = balancesResponse.data;

      // Create map of sales_id to balance allocation
      const balanceMap = {};
      balances.forEach(balance => {
        if (balance.sales_id) {
          balanceMap[balance.sales_id] = balance;
        }
      });

      setAllocatedBalances(balanceMap);
    } catch (err) {
      console.error('Error fetching allocated balances:', err);
      // Non-critical error, don't block main flow
    }
  }, []);

  const fetchSalesData = useCallback(async () => {
    try {
      const [salesResponse, productsResponse, creditHoldersResponse] = await Promise.all([
        api.get('/sales'),
        api.get('/products'),
        api.get('/credit-holders')
      ]);

      const salesData = salesResponse.data;
      setProducts(productsResponse.data);
      setCreditHolders(creditHoldersResponse.data);

      // Fetch allocated balances for all sales
      await fetchAllocatedBalances(salesData);

      // Separate pending and approved sales
      const pendingSales = salesData.filter(sale => sale.status === 'pending');
      const approvedSales = salesData.filter(sale => sale.status === 'approved' || !sale.status);

      // Store pending sales for display
      setPendingSalesList(pendingSales);

      // Group approved sales by month
      const grouped = {};
      approvedSales.forEach(sale => {
        const date = new Date(sale.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        if (!grouped[monthKey]) {
          grouped[monthKey] = {
            label: monthLabel,
            sales: []
          };
        }
        grouped[monthKey].sales.push(sale);
      });

      // Sort months in descending order (most recent first)
      const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
      const sortedGrouped = {};
      sortedMonths.forEach(key => {
        sortedGrouped[key] = grouped[key];
      });

      setSalesByMonth(sortedGrouped);

      // Set the first (most recent) month as active
      if (sortedMonths.length > 0) {
        setActiveMonth(sortedMonths[0]);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to fetch sales data');
      setLoading(false);
    }
  }, [fetchAllocatedBalances]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  const calculateCreditSum = (sale) => {
    if (!Array.isArray(sale.credit)) return 0;
    return sale.credit.reduce((sum, item) => sum + parseFloat(item.creditgiven || 0), 0);
  };

  const calculateMonthTotals = (monthSales) => {
    return monthSales.reduce((totals, sale) => {
      totals.cash += parseFloat(sale.cash_collected || 0);
      totals.upi += parseFloat(sale.upi || 0);
      totals.credit += calculateCreditSum(sale);
      return totals;
    }, { cash: 0, upi: 0, credit: 0 });
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.product_name : 'Unknown Product';
  };

  const getCreditHolderName = (creditHolderId) => {
    const holder = creditHolders.find(ch => ch.id === creditHolderId);
    return holder ? holder.name : 'Unknown';
  };

  const getProductSalePrice = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? parseFloat(product.sale_price || 0) : 0;
  };

  const handleRowClick = (sale) => {
    // Add allocated balances to the sale data
    const saleWithBalances = {
      ...sale,
      balances: allocatedBalances[sale.id] || null
    };
    setSelectedSale(saleWithBalances);
  };

  const closeModal = () => {
    setSelectedSale(null);
  };

  const handleAllocateBalance = (sale, e) => {
    e.stopPropagation(); // Prevent row click

    // Calculate total available for allocation
    // Note: cash_collected already includes (cashSales + creditTakenCash + miscCash - expenses)
    // and credit given was already subtracted in cashSales calculation
    const maxAllowed = parseFloat(sale.cash_collected || 0) + parseFloat(sale.upi || 0);

    setAllocationSale(sale);
    setAllocationForm({
      cashBalance: '0',
      bankBalance: maxAllowed.toString(),
      galaBalance: '0'
    });
    setAllocationError('');
    setShowAllocationModal(true);
  };

  const handleCloseAllocationModal = () => {
    setShowAllocationModal(false);
    setAllocationSale(null);
    setAllocationForm({
      cashBalance: '',
      bankBalance: '',
      galaBalance: ''
    });
    setAllocationError('');
  };

  const handleAllocationFieldChange = (field, value) => {
    if (!allocationSale) return;

    // Calculate total available for allocation
    const maxAllowed = parseFloat(allocationSale.cash_collected || 0) + parseFloat(allocationSale.upi || 0);

    let newForm = { ...allocationForm, [field]: value };

    // Auto-calculate bank balance based on cash and gala
    const cashBal = parseFloat(newForm.cashBalance || 0);
    const galaBal = parseFloat(newForm.galaBalance || 0);
    const calculatedBankBalance = maxAllowed - cashBal - galaBal;

    newForm.bankBalance = Math.max(0, calculatedBankBalance).toString();

    setAllocationForm(newForm);
    setAllocationError('');
  };

  const handleSubmitAllocation = async () => {
    if (!allocationSale) return;

    const maxAllowed = parseFloat(allocationSale.cash_collected || 0) + parseFloat(allocationSale.upi || 0);

    const cashBal = parseFloat(allocationForm.cashBalance || 0);
    const bankBal = parseFloat(allocationForm.bankBalance || 0);
    const galaBal = parseFloat(allocationForm.galaBalance || 0);
    const totalAllocated = cashBal + bankBal + galaBal;

    // Require full allocation - no partial allocations allowed
    if (Math.abs(totalAllocated - maxAllowed) > 0.01) {
      setAllocationError(
        `All funds must be allocated!\n` +
        `Total Available: ₹${maxAllowed.toFixed(2)}\n` +
        `Currently Allocated: ₹${totalAllocated.toFixed(2)}\n\n` +
        `सभी फंड आवंटित किए जाने चाहिए!`
      );
      return;
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to allocate the following balances?\n\n` +
      `Cash Balance: ₹${cashBal.toFixed(2)}\n` +
      `Bank Balance: ₹${bankBal.toFixed(2)}\n` +
      `Gala Balance: ₹${galaBal.toFixed(2)}\n\n` +
      `Total: ₹${totalAllocated.toFixed(2)}\n\n` +
      `⚠️ This action cannot be undone!\n` +
      `क्या आप सुनिश्चित हैं?`
    );

    if (!confirmed) return;

    try {
      await api.post('/balances', {
        salesId: allocationSale.id,
        date: allocationSale.date,
        cashBalance: cashBal,
        bankBalance: bankBal,
        galaBalance: galaBal
      });

      // Refresh allocated balances
      const salesData = [];
      Object.values(salesByMonth).forEach(month => {
        salesData.push(...month.sales);
      });
      await fetchAllocatedBalances(salesData);

      alert('✅ Balance allocated successfully!\nशेष सफलतापूर्वक आवंटित किया गया!');
      handleCloseAllocationModal();
    } catch (err) {
      console.error('Error allocating balance:', err);
      setAllocationError(err.response?.data?.error || 'Failed to allocate balance');
    }
  };

  const isBalanceAllocated = (saleId) => {
    return !!allocatedBalances[saleId];
  };

  const handleOpenApprovalModal = (sale) => {
    setApprovalSale(sale);

    // Initialize product data from sale
    const productDataMap = {};
    if (sale.opening_stock && Array.isArray(sale.opening_stock)) {
      sale.opening_stock.forEach(item => {
        productDataMap[item.product_id] = {
          openingStock: item.opening_stock || 0,
          closingStock: 0,
          sale: 0
        };
      });
    }

    if (sale.closing_stock && Array.isArray(sale.closing_stock)) {
      sale.closing_stock.forEach(item => {
        if (productDataMap[item.product_id]) {
          productDataMap[item.product_id].closingStock = item.closing_stock || 0;
        }
      });
    }

    if (sale.sale && Array.isArray(sale.sale)) {
      sale.sale.forEach(item => {
        if (productDataMap[item.product_id]) {
          productDataMap[item.product_id].sale = item.sale || 0;
        }
      });
    }

    // Initialize credit entries from sale
    const creditEntriesData = [];
    if (sale.credit && Array.isArray(sale.credit)) {
      sale.credit.forEach(item => {
        creditEntriesData.push({
          creditHolderId: item.credit_holder_id,
          amount: item.creditgiven || 0
        });
      });
    }

    // Initialize credit collected entries from sale.creditTaken (now from sales.credit_taken column)
    const creditTakenData = [];
    if (sale.creditTaken && Array.isArray(sale.creditTaken)) {
      sale.creditTaken.forEach(item => {
        creditTakenData.push({
          creditHolderId: item.creditHolderId,
          amount: item.amount || 0,
          collectedIn: item.collectedIn || 'cash_balance'
        });
      });
    }

    // Initialize daily expenses from sale
    const dailyExpensesData = [];
    if (sale.dailyExpenses && Array.isArray(sale.dailyExpenses)) {
      sale.dailyExpenses.forEach(item => {
        dailyExpensesData.push({
          name: item.name || '',
          description: item.description || '',
          amount: item.amount || 0
        });
      });
    }

    // Convert date to local format for the date input
    let localDateString;
    if (sale.date) {
      const saleDate = new Date(sale.date);
      const year = saleDate.getFullYear();
      const month = String(saleDate.getMonth() + 1).padStart(2, '0');
      const day = String(saleDate.getDate()).padStart(2, '0');
      localDateString = `${year}-${month}-${day}`;
    } else {
      localDateString = new Date().toISOString().split('T')[0];
    }

    setApprovalForm({
      date: localDateString,
      productData: productDataMap,
      upiTotal: sale.upi || 0,
      galaBalanceToday: sale.gala_balance_today || 0,
      miscellaneousCash: sale.miscellaneous_cash || 0,
      miscellaneousUPI: sale.miscellaneous_upi || 0,
      creditEntries: creditEntriesData,
      creditTaken: creditTakenData,
      dailyExpenses: dailyExpensesData,
      remarks: sale.remarks || ''
    });
    setApprovalError('');
    setShowApprovalModal(true);
  };

  const handleCloseApprovalModal = () => {
    setShowApprovalModal(false);
    setApprovalSale(null);
    setApprovalForm({});
    setApprovalError('');
  };

  const handleProductChangeInApproval = (productId, field, value) => {
    const data = { ...approvalForm.productData[productId] };
    data[field] = value;

    if (field === 'closingStock' && data.openingStock !== '') {
      const opening = parseFloat(data.openingStock) || 0;
      const closing = parseFloat(value) || 0;
      data.sale = (opening - closing).toString();
    } else if (field === 'sale' && data.openingStock !== '') {
      const opening = parseFloat(data.openingStock) || 0;
      const saleValue = parseFloat(value) || 0;
      data.closingStock = (opening - saleValue).toString();
    }

    setApprovalForm({
      ...approvalForm,
      productData: {
        ...approvalForm.productData,
        [productId]: data
      }
    });
  };

  const addCreditEntryInApproval = () => {
    setApprovalForm({
      ...approvalForm,
      creditEntries: [...(approvalForm.creditEntries || []), { creditHolderId: '', amount: '' }]
    });
  };

  const updateCreditEntryInApproval = (index, field, value) => {
    const updated = [...(approvalForm.creditEntries || [])];
    updated[index][field] = value;
    setApprovalForm({
      ...approvalForm,
      creditEntries: updated
    });
  };

  const removeCreditEntryInApproval = (index) => {
    setApprovalForm({
      ...approvalForm,
      creditEntries: (approvalForm.creditEntries || []).filter((_, i) => i !== index)
    });
  };

  // Credit Collected handlers
  const addCreditTakenInApproval = () => {
    setApprovalForm({
      ...approvalForm,
      creditTaken: [...(approvalForm.creditTaken || []), { creditHolderId: '', amount: '', collectedIn: 'cash_balance' }]
    });
  };

  const updateCreditTakenInApproval = (index, field, value) => {
    const updated = [...(approvalForm.creditTaken || [])];
    updated[index][field] = value;
    setApprovalForm({
      ...approvalForm,
      creditTaken: updated
    });
  };

  const removeCreditTakenInApproval = (index) => {
    setApprovalForm({
      ...approvalForm,
      creditTaken: (approvalForm.creditTaken || []).filter((_, i) => i !== index)
    });
  };

  // Daily Expenses handlers
  const addDailyExpenseInApproval = () => {
    setApprovalForm({
      ...approvalForm,
      dailyExpenses: [...(approvalForm.dailyExpenses || []), { name: '', description: '', amount: '' }]
    });
  };

  const updateDailyExpenseInApproval = (index, field, value) => {
    const updated = [...(approvalForm.dailyExpenses || [])];
    updated[index][field] = value;
    setApprovalForm({
      ...approvalForm,
      dailyExpenses: updated
    });
  };

  const removeDailyExpenseInApproval = (index) => {
    setApprovalForm({
      ...approvalForm,
      dailyExpenses: (approvalForm.dailyExpenses || []).filter((_, i) => i !== index)
    });
  };

  // Calculate totals in approval modal (similar to AddSales)
  const calculateApprovaTotals = () => {
    if (!approvalForm.productData) return { totalSales: 0, upiSales: 0, cashSales: 0, cashCollected: 0 };

    const totalSales = products.reduce((sum, product) => {
      const data = approvalForm.productData[product.id];
      if (!data) return sum;
      return sum + ((parseFloat(data.sale) || 0) * (parseFloat(product.sale_price) || 0));
    }, 0);

    const totalCreditGiven = (approvalForm.creditEntries || []).reduce((sum, entry) => {
      return sum + (entry.creditHolderId && entry.amount ? parseFloat(entry.amount) : 0);
    }, 0);

    const creditTakenCash = (approvalForm.creditTaken || [])
      .filter(c => c.collectedIn === 'cash_balance')
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

    const creditTakenUPI = (approvalForm.creditTaken || [])
      .filter(c => c.collectedIn === 'bank_balance')
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

    const miscCash = parseFloat(approvalForm.miscellaneousCash || 0);
    const miscUPI = parseFloat(approvalForm.miscellaneousUPI || 0);

    // Calculate total expenses
    const totalExpenses = (approvalForm.dailyExpenses || []).reduce((sum, expense) => {
      return sum + (parseFloat(expense.amount) || 0);
    }, 0);

    const upiTotalValue = parseFloat(approvalForm.upiTotal || 0);

    const upiSales = Math.max(0, upiTotalValue - creditTakenUPI - miscUPI);
    const cashSales = Math.max(0, totalSales - upiSales - totalCreditGiven + miscCash);
    const cashCollected = cashSales + creditTakenCash - totalExpenses;

    return {
      totalSales,
      totalCreditGiven,
      creditTakenCash,
      creditTakenUPI,
      miscCash,
      miscUPI,
      upiSales,
      cashSales,
      cashCollected,
      totalExpenses
    };
  };

  const handleApproveSale = async () => {
    if (!approvalSale) return;

    const confirmed = window.confirm(
      `Are you sure you want to approve this sale?\n\n` +
      `This will update inventory and credit holders.\n` +
      `This action cannot be undone!\n\n` +
      `क्या आप सुनिश्चित हैं?`
    );

    if (!confirmed) return;

    try {
      const openingStockData = [];
      const closingStockData = [];
      const saleData = [];

      Object.keys(approvalForm.productData || {}).forEach(productId => {
        const data = approvalForm.productData[productId];

        if (data.openingStock !== '' && data.openingStock !== null && data.openingStock !== undefined) {
          openingStockData.push({
            product_id: productId,
            opening_stock: parseFloat(data.openingStock) || 0
          });
        }

        if (data.closingStock !== '' && data.closingStock !== null && data.closingStock !== undefined) {
          closingStockData.push({
            product_id: productId,
            closing_stock: parseFloat(data.closingStock) || 0
          });
        }

        if (data.sale !== '' && data.sale !== null && data.sale !== undefined) {
          saleData.push({
            product_id: productId,
            sale: parseFloat(data.sale) || 0
          });
        }
      });

      const creditData = [];
      (approvalForm.creditEntries || []).forEach(entry => {
        if (entry.creditHolderId && entry.amount) {
          creditData.push({
            credit_holder_id: entry.creditHolderId,
            creditgiven: parseFloat(entry.amount)
          });
        }
      });

      // Prepare credit collected data
      const creditTakenData = (approvalForm.creditTaken || [])
        .filter(ct => ct.creditHolderId && ct.amount)
        .map(ct => ({
          creditHolderId: ct.creditHolderId,
          amount: parseFloat(ct.amount),
          collectedIn: ct.collectedIn
        }));

      // Prepare daily expenses data
      const expensesData = (approvalForm.dailyExpenses || [])
        .filter(exp => exp.name && exp.amount)
        .map(exp => ({
          name: exp.name,
          description: exp.description || '',
          amount: parseFloat(exp.amount)
        }));

      const totals = calculateApprovaTotals();

      const payload = {
        date: approvalForm.date,
        openingStock: openingStockData.length > 0 ? openingStockData : null,
        closingStock: closingStockData.length > 0 ? closingStockData : null,
        sale: saleData.length > 0 ? saleData : null,
        cashCollected: totals.cashCollected,
        upi: parseFloat(approvalForm.upiTotal) || 0,
        miscellaneous: (parseFloat(approvalForm.miscellaneousCash || 0) + parseFloat(approvalForm.miscellaneousUPI || 0)),
        miscellaneousType: 'both',
        miscellaneousCash: parseFloat(approvalForm.miscellaneousCash) || 0,
        miscellaneousUPI: parseFloat(approvalForm.miscellaneousUPI) || 0,
        galaBalanceToday: parseFloat(approvalForm.galaBalanceToday) || 0,
        credit: creditData.length > 0 ? creditData : null,
        creditTaken: creditTakenData.length > 0 ? creditTakenData : null,
        dailyExpenses: expensesData.length > 0 ? expensesData : null,
        remarks: approvalForm.remarks || null
      };

      await api.post(`/sales/${approvalSale.id}/approve`, payload);

      alert('✅ Sale approved successfully!\nबिक्री सफलतापूर्वक स्वीकृत हो गई!');
      handleCloseApprovalModal();
      await fetchSalesData();
    } catch (err) {
      console.error('Error approving sale:', err);
      setApprovalError(err.response?.data?.error || 'Failed to approve sale');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const monthKeys = Object.keys(salesByMonth);

  return (
    <>
      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <h2 style={{ color: '#000', margin: 0, fontSize: '2rem', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '2rem' }}>
        Sales Reports
      </h2>

      {/* Pending Sales Section */}
      {pendingSalesList.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            backgroundColor: '#fff3cd',
            borderRadius: '12px',
            border: '2px solid #ffc107',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={24} style={{ color: '#856404' }} />
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#856404' }}>
                Pending Sales Approvals ({pendingSalesList.length})
              </h3>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="desktop-only table-container" style={{
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '2px solid #ffc107'
          }}>
            <table className="table" style={{ marginBottom: 0 }}>
              <thead style={{ backgroundColor: '#ffc107' }}>
                <tr>
                  <th style={{ color: '#fff', padding: '1.25rem 1rem' }}>Date</th>
                  <th style={{ color: '#fff', padding: '1.25rem 1rem' }}>User</th>
                  <th style={{ color: '#fff', padding: '1.25rem 1rem' }}>Cash</th>
                  <th style={{ color: '#fff', padding: '1.25rem 1rem' }}>UPI</th>
                  <th style={{ color: '#fff', padding: '1.25rem 1rem' }}>Credit</th>
                  <th style={{ color: '#fff', padding: '1.25rem 1rem' }}>Total</th>
                  <th style={{ color: '#fff', padding: '1.25rem 1rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingSalesList.map((sale, index) => {
                  const creditSum = calculateCreditSum(sale);
                  const total = parseFloat(sale.cash_collected || 0) +
                                parseFloat(sale.upi || 0) -
                                creditSum;

                  return (
                    <tr
                      key={sale.id}
                      style={{
                        backgroundColor: index % 2 === 0 ? '#fff9e6' : '#fff3cd',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleRowClick(sale)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffe8a1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff9e6' : '#fff3cd';
                      }}
                    >
                      <td style={{ padding: '1rem', fontWeight: '600' }}>{new Date(sale.date).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem' }}>{sale.username || 'N/A'}</td>
                      <td style={{ padding: '1rem', fontWeight: '600' }}>₹{parseFloat(sale.cash_collected || 0).toFixed(2)}</td>
                      <td style={{ padding: '1rem', fontWeight: '600', color: '#4CAF50' }}>₹{parseFloat(sale.upi || 0).toFixed(2)}</td>
                      <td style={{ padding: '1rem', fontWeight: '600', color: '#ff9800' }}>₹{creditSum.toFixed(2)}</td>
                      <td style={{ padding: '1rem', fontWeight: '700', fontSize: '1.125rem', color: '#000' }}>₹{total.toFixed(2)}</td>
                      <td style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleOpenApprovalModal(sale)}
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem',
                            background: '#ffc107',
                            color: '#000',
                            border: 'none',
                            fontWeight: '600'
                          }}
                        >
                          Review & Approve
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="mobile-only">
            {pendingSalesList.map((sale) => {
              const creditSum = calculateCreditSum(sale);
              const total = parseFloat(sale.cash_collected || 0) +
                            parseFloat(sale.upi || 0) -
                            creditSum;

              return (
                <div
                  key={sale.id}
                  className="card"
                  onClick={() => handleRowClick(sale)}
                  style={{
                    marginBottom: '1rem',
                    padding: '1.25rem',
                    background: 'linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%)',
                    border: '2px solid #ffc107',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(255, 193, 7, 0.2)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#856404', fontWeight: '600', marginBottom: '0.25rem' }}>
                        {new Date(sale.date).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#666', fontWeight: '500' }}>
                        User: {sale.username || 'N/A'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#856404', marginBottom: '0.25rem' }}>TOTAL</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#000' }}>
                        ₹{total.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.7)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.25rem' }}>CASH</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#000' }}>
                        ₹{parseFloat(sale.cash_collected || 0).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.25rem' }}>UPI</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#4CAF50' }}>
                        ₹{parseFloat(sale.upi || 0).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(255, 152, 0, 0.1)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.25rem' }}>CREDIT</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#ff9800' }}>
                        ₹{creditSum.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenApprovalModal(sale);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      fontSize: '0.875rem',
                      background: '#ffc107',
                      color: '#000',
                      border: 'none',
                      fontWeight: '700'
                    }}
                  >
                    Review & Approve
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {monthKeys.length === 0 && pendingSalesList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#666', fontSize: '1.25rem' }}>No sales data available</p>
        </div>
      ) : (
        <>
          {/* Month Summary Stats */}
          {activeMonth && salesByMonth[activeMonth] && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'clamp(0.75rem, 2vw, 1.5rem)', marginBottom: '1.5rem' }}>
              <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ color: 'white', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    Cash Collected
                  </h3>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                  ₹{calculateMonthTotals(salesByMonth[activeMonth].sales).cash.toFixed(2)}
                </p>
              </div>

              <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <CreditCard size={20} />
                  <h3 style={{ color: 'white', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    UPI Collected
                  </h3>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                  ₹{calculateMonthTotals(salesByMonth[activeMonth].sales).upi.toFixed(2)}
                </p>
              </div>

              <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <TrendingUp size={20} />
                  <h3 style={{ color: 'white', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    Credit Given
                  </h3>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                  ₹{calculateMonthTotals(salesByMonth[activeMonth].sales).credit.toFixed(2)}
                </p>
              </div>

            </div>
          )}

          {/* Month Tabs */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            overflowX: 'auto',
            flexWrap: 'wrap',
            padding: 'clamp(0.75rem, 2vw, 1rem)',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            borderBottom: '3px solid #000'
          }}>
            {monthKeys.map(monthKey => (
              <button
                key={monthKey}
                onClick={() => setActiveMonth(monthKey)}
                style={{
                  padding: '1rem 2rem',
                  background: activeMonth === monthKey ? '#000' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: activeMonth === monthKey ? 'white' : '#666',
                  fontWeight: activeMonth === monthKey ? '700' : '600',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  transition: 'all 0.3s',
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Calendar size={18} />
                {salesByMonth[monthKey].label}
              </button>
            ))}
          </div>

          {/* Active Month Table - Desktop */}
          {activeMonth && salesByMonth[activeMonth] && (
            <div className="desktop-only table-container" style={{
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e0e0e0'
            }}>
              <table className="table" style={{ marginBottom: 0 }}>
                <thead style={{ backgroundColor: '#000' }}>
                  <tr>
                    <th style={{ color: 'white', padding: '1.25rem 1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={16} />
                        Date
                      </div>
                    </th>
                    <th style={{ color: 'white', padding: '1.25rem 1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={16} />
                        User
                      </div>
                    </th>
                    <th style={{ color: 'white', padding: '1.25rem 1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Cash
                      </div>
                    </th>
                    <th style={{ color: 'white', padding: '1.25rem 1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CreditCard size={16} />
                        UPI
                      </div>
                    </th>
                    <th style={{ color: 'white', padding: '1.25rem 1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={16} />
                        Credit
                      </div>
                    </th>
                    <th style={{ color: 'white', padding: '1.25rem 1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} />
                        Total
                      </div>
                    </th>
                    <th style={{ color: 'white', padding: '1.25rem 1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Wallet size={16} />
                        Balances
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {salesByMonth[activeMonth].sales.map((sale, index) => {
                    const creditSum = calculateCreditSum(sale);
                    const total = parseFloat(sale.cash_collected || 0) +
                                  parseFloat(sale.upi || 0);
                    const allocated = isBalanceAllocated(sale.id);

                    return (
                      <tr
                        key={sale.id}
                        onClick={() => handleRowClick(sale)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: index % 2 === 0 ? 'white' : '#fafafa',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f7ff';
                          e.currentTarget.style.transform = 'scale(1.01)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#fafafa';
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <td style={{ padding: '1rem', fontWeight: '600' }}>{new Date(sale.date).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem' }}>{sale.username || 'N/A'}</td>
                        <td style={{ padding: '1rem', color: '#000', fontWeight: '600' }}>₹{parseFloat(sale.cash_collected || 0).toFixed(2)}</td>
                        <td style={{ padding: '1rem', color: '#4CAF50', fontWeight: '600' }}>₹{parseFloat(sale.upi || 0).toFixed(2)}</td>
                        <td style={{ padding: '0.5rem 1rem', color: '#ff9800', fontWeight: '600' }}>
                          {Array.isArray(sale.credit) && sale.credit.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {sale.credit.map((item, idx) => (
                                <div key={idx} style={{ fontSize: '0.875rem' }}>
                                  {getCreditHolderName(item.credit_holder_id)} → ₹{parseFloat(item.creditgiven || 0).toFixed(2)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            '₹0.00'
                          )}
                        </td>
                        <td style={{ padding: '1rem', fontWeight: '700', fontSize: '1.125rem', color: '#2196F3' }}>₹{total.toFixed(2)}</td>
                        <td style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                          {sale.status === 'pending' ? (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem 1rem',
                              backgroundColor: '#fff3cd',
                              color: '#856404',
                              borderRadius: '8px',
                              border: '1px solid #ffc107',
                              fontSize: '0.875rem',
                              fontWeight: '600'
                            }}>
                              <AlertCircle size={16} />
                              Pending
                            </div>
                          ) : allocated ? (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem 1rem',
                              backgroundColor: '#d4edda',
                              color: '#155724',
                              borderRadius: '8px',
                              border: '1px solid #28a745',
                              fontSize: '0.875rem',
                              fontWeight: '600'
                            }}>
                              <CheckCircle size={16} />
                              Allocated
                            </div>
                          ) : (
                            <button
                              className="btn btn-primary"
                              onClick={(e) => handleAllocateBalance(sale, e)}
                              style={{
                                padding: '0.5rem 1rem',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                            >
                              <Wallet size={16} />
                              Allocate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: '700', backgroundColor: '#000', color: 'white' }}>
                    <td colSpan="2" style={{ padding: '1.25rem 1rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Month Total</td>
                    <td style={{ padding: '1.25rem 1rem', fontSize: '1rem' }}>₹{calculateMonthTotals(salesByMonth[activeMonth].sales).cash.toFixed(2)}</td>
                    <td style={{ padding: '1.25rem 1rem', fontSize: '1rem' }}>₹{calculateMonthTotals(salesByMonth[activeMonth].sales).upi.toFixed(2)}</td>
                    <td style={{ padding: '1.25rem 1rem', fontSize: '1rem' }}>₹{calculateMonthTotals(salesByMonth[activeMonth].sales).credit.toFixed(2)}</td>
                    <td style={{ padding: '1.25rem 1rem', fontSize: '1.25rem', fontWeight: '700' }}>
                      ₹{(calculateMonthTotals(salesByMonth[activeMonth].sales).cash +
                         calculateMonthTotals(salesByMonth[activeMonth].sales).upi -
                         calculateMonthTotals(salesByMonth[activeMonth].sales).credit).toFixed(2)}
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Active Month Cards - Mobile */}
          {activeMonth && salesByMonth[activeMonth] && (
            <div className="mobile-only">
              {salesByMonth[activeMonth].sales.map((sale) => {
                const creditSum = calculateCreditSum(sale);
                const total = parseFloat(sale.cash_collected || 0) +
                              parseFloat(sale.upi || 0) -
                              creditSum;
                const allocated = isBalanceAllocated(sale.id);

                return (
                  <div
                    key={sale.id}
                    className="card"
                    onClick={() => handleRowClick(sale)}
                    style={{
                      marginBottom: '1rem',
                      padding: '1.25rem',
                      cursor: 'pointer',
                      background: 'linear-gradient(135deg, #fff 0%, #fafafa 100%)',
                      border: '1px solid #e0e0e0',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: '600', marginBottom: '0.25rem' }}>
                          {new Date(sale.date).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#666', fontWeight: '500' }}>
                          User: {sale.username || 'N/A'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>TOTAL</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2196F3' }}>
                          ₹{total.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(0, 0, 0, 0.05)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.25rem' }}>CASH</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#000' }}>
                          ₹{parseFloat(sale.cash_collected || 0).toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.25rem' }}>UPI</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#4CAF50' }}>
                          ₹{parseFloat(sale.upi || 0).toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(255, 152, 0, 0.1)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.25rem' }}>CREDIT</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#ff9800' }}>
                          ₹{creditSum.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {Array.isArray(sale.credit) && sale.credit.length > 0 && (
                      <div style={{ padding: '0.75rem', background: 'rgba(255, 152, 0, 0.05)', borderRadius: '8px', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#666', marginBottom: '0.5rem' }}>Credit Details:</div>
                        {sale.credit.map((item, idx) => (
                          <div key={idx} style={{ fontSize: '0.875rem', color: '#ff9800', marginBottom: '0.25rem' }}>
                            {getCreditHolderName(item.credit_holder_id)} → ₹{parseFloat(item.creditgiven || 0).toFixed(2)}
                          </div>
                        ))}
                      </div>
                    )}

                    <div onClick={(e) => e.stopPropagation()}>
                      {sale.status === 'pending' ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          padding: '0.875rem',
                          backgroundColor: '#fff3cd',
                          color: '#856404',
                          borderRadius: '8px',
                          border: '1px solid #ffc107',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>
                          <AlertCircle size={16} />
                          Pending Approval
                        </div>
                      ) : allocated ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          padding: '0.875rem',
                          backgroundColor: '#d4edda',
                          color: '#155724',
                          borderRadius: '8px',
                          border: '1px solid #28a745',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>
                          <CheckCircle size={16} />
                          Balance Allocated
                        </div>
                      ) : (
                        <button
                          className="btn btn-primary"
                          onClick={(e) => handleAllocateBalance(sale, e)}
                          style={{
                            width: '100%',
                            padding: '0.875rem',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <Wallet size={16} />
                          Allocate Balance
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Month Total Card - Mobile */}
              <div className="card" style={{
                background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
                color: 'white',
                padding: '1.5rem',
                marginTop: '1rem'
              }}>
                <h3 style={{ color: 'white', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem' }}>
                  Month Total
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>Cash</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: '700' }}>
                      ₹{calculateMonthTotals(salesByMonth[activeMonth].sales).cash.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>UPI</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: '700' }}>
                      ₹{calculateMonthTotals(salesByMonth[activeMonth].sales).upi.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>Credit</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: '700' }}>
                      ₹{calculateMonthTotals(salesByMonth[activeMonth].sales).credit.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>Total</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                      ₹{(calculateMonthTotals(salesByMonth[activeMonth].sales).cash +
                         calculateMonthTotals(salesByMonth[activeMonth].sales).upi -
                         calculateMonthTotals(salesByMonth[activeMonth].sales).credit).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Balance Allocation Modal */}
      {showAllocationModal && allocationSale && (
        <div
          className="modal-overlay"
          onClick={handleCloseAllocationModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem'
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '2rem',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              position: 'relative'
            }}>
              <button
                onClick={handleCloseAllocationModal}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>

              <h3 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Wallet size={28} />
                Allocate Balance | शेष आवंटित करें
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                {new Date(allocationSale.date).toLocaleDateString()} - {allocationSale.username}
              </p>
            </div>

            <div style={{ padding: '2rem' }}>
              {allocationError && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  border: '1px solid #f5c6cb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertCircle size={20} />
                  {allocationError}
                </div>
              )}

              {/* Collection Summary */}
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#e3f2fd',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                border: '2px solid #2196f3'
              }}>
                <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#1565c0', fontWeight: '600' }}>
                  Total Collection Available:
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#0d47a1' }}>
                  ₹{(parseFloat(allocationSale.cash_collected || 0) + parseFloat(allocationSale.upi || 0)).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#1565c0', marginTop: '0.25rem' }}>
                  = Cash Collected (₹{parseFloat(allocationSale.cash_collected || 0).toFixed(2)}) + UPI (₹{parseFloat(allocationSale.upi || 0).toFixed(2)})
                </div>
                <div style={{ fontSize: '0.7rem', color: '#1565c0', marginTop: '0.25rem', fontStyle: 'italic' }}>
                  {(() => {
                    const totalcredit = calculateCreditSum(allocationSale);
                    const creditTakenCash = (allocationSale.creditTaken || [])
                      .filter(c => c.collectedIn === 'cash_balance')
                      .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
                    const miscCash = parseFloat(allocationSale.miscellaneous_cash || 0);
                    const expenses = (allocationSale.dailyExpenses || []).reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);

                    return `+ Credit Collected ₹${creditTakenCash.toFixed(2)} - Credit Given ₹${totalcredit.toFixed(2)} + Misc ₹${miscCash.toFixed(2)} - Expenses ₹${expenses.toFixed(2)}`;
                  })()}
                </div>
              </div>

              {/* Allocation Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '1rem', fontWeight: '600' }}>
                    Amount to Add to Cash Balance for the day | नकद शेष
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={allocationForm.cashBalance}
                    onChange={(e) => handleAllocationFieldChange('cashBalance', e.target.value)}
                    placeholder="₹ 0.00"
                    step="1"
                    min="0"
                    style={{ fontSize: '1.25rem', padding: '1rem' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '1rem', fontWeight: '600' }}>
                    Amount to Add to Gala Balance for the day | गला शेष
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={allocationForm.galaBalance}
                    onChange={(e) => handleAllocationFieldChange('galaBalance', e.target.value)}
                    placeholder="₹ 0.00"
                    step="1"
                    min="0"
                    style={{ fontSize: '1.25rem', padding: '1rem' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Amount to Add to Bank Balance for the day | बैंक शेष
                    <span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#666' }}>
                      (Auto-calculated | स्वतः गणना)
                    </span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={allocationForm.bankBalance}
                    disabled
                    placeholder="₹ 0.00"
                    step="1"
                    min="0"
                    style={{
                      fontSize: '1.25rem',
                      padding: '1rem',
                      backgroundColor: '#e9ecef',
                      cursor: 'not-allowed',
                      fontWeight: '600'
                    }}
                  />
                </div>

                {/* Total Allocated Display */}
                {(() => {
                  const cashBal = parseFloat(allocationForm.cashBalance || 0);
                  const bankBal = parseFloat(allocationForm.bankBalance || 0);
                  const galaBal = parseFloat(allocationForm.galaBalance || 0);
                  const totalAllocated = cashBal + bankBal + galaBal;

                  const maxAllowed = parseFloat(allocationSale.cash_collected || 0) + parseFloat(allocationSale.upi || 0);
                  const remaining = maxAllowed - totalAllocated;

                  if (totalAllocated > 0) {
                    return (
                      <div style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        border: `2px solid ${totalAllocated > maxAllowed ? '#dc3545' : '#28a745'}`,
                        backgroundColor: totalAllocated > maxAllowed ? '#f8d7da' : '#d4edda'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.875rem', color: '#666' }}>Total Allocated:</span>
                          <span style={{ fontSize: '1.125rem', fontWeight: '700' }}>
                            ₹{totalAllocated.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.875rem', color: '#666' }}>Max Allowed:</span>
                          <span style={{ fontSize: '1.125rem', fontWeight: '700' }}>
                            ₹{maxAllowed.toFixed(2)}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          paddingTop: '0.5rem',
                          borderTop: '1px solid #ccc'
                        }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                            {remaining >= 0 ? 'Remaining:' : 'Exceeds by:'}
                          </span>
                          <span style={{
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            color: remaining >= 0 ? '#28a745' : '#dc3545'
                          }}>
                            ₹{Math.abs(remaining).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Warning */}
              <div style={{
                padding: '1rem',
                backgroundColor: '#fff3cd',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid #ffc107',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}>
                <AlertCircle size={20} style={{ color: '#856404', marginTop: '2px' }} />
                <div style={{ fontSize: '0.875rem', color: '#856404' }}>
                  <strong>Warning:</strong> Once allocated, balances cannot be edited. Please verify before submitting.<br />
                  <strong>चेतावनी:</strong> एक बार आवंटित होने के बाद, शेष राशि संपादित नहीं की जा सकती।
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitAllocation}
                  style={{ flex: 1, padding: '1rem', fontSize: '1rem', fontWeight: '600' }}
                >
                  Allocate Balance | आवंटित करें
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleCloseAllocationModal}
                  style={{ flex: 1, padding: '1rem', fontSize: '1rem' }}
                >
                  Cancel | रद्द करें
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Sales Modal (existing) */}
      {selectedSale && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              maxWidth: '1000px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '0',
              position: 'relative',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
              color: 'white',
              padding: '2rem',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              position: 'relative'
            }}>
              <button
                onClick={closeModal}
                style={{
                  position: 'absolute',
                  top: '1.5rem',
                  right: '1.5rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                <X size={20} />
              </button>

              <h2 style={{ color: 'white', margin: 0, fontWeight: '700', fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={28} />
                Sales Report
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '0.5rem 0 0 0', fontSize: '1rem' }}>
                {new Date(selectedSale.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '2rem' }}>
              {/* Basic Info */}
              <div style={{
                marginBottom: '2rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderRadius: '12px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: '#000', color: 'white', borderRadius: '8px', padding: '0.5rem', display: 'flex' }}>
                      <User size={20} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>User</p>
                      <p style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#000' }}>{selectedSale.username || 'N/A'}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: '#2196F3', color: 'white', borderRadius: '8px', padding: '0.5rem', display: 'flex' }}>
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</p>
                      <p style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#000' }}>{new Date(selectedSale.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: '#4CAF50', color: 'white', borderRadius: '8px', padding: '0.5rem', display: 'flex' }}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submitted</p>
                      <p style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#000' }}>{new Date(selectedSale.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Table - Combined View */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#000', fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={24} style={{ color: '#000' }} />
                  Product Sales Details
                </h3>
                {/* Desktop View */}
                <div className="desktop-only" style={{ borderRadius: '12px', overflow: 'hidden', border: '2px solid #000', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }}>
                  <table className="table" style={{ marginBottom: 0 }}>
                    <thead style={{ backgroundColor: '#000' }}>
                      <tr>
                        <th style={{ color: 'white', padding: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Product</th>
                        <th style={{ color: 'white', padding: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <Package size={16} />
                            Opening Stock
                          </div>
                        </th>
                        <th style={{ color: 'white', padding: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <Package size={16} />
                            Closing Stock
                          </div>
                        </th>
                        <th style={{ color: 'white', padding: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={16} />
                            Sale
                          </div>
                        </th>
                        <th style={{ color: 'white', padding: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                          Sale Price
                        </th>
                        <th style={{ color: 'white', padding: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.opening_stock && Array.isArray(selectedSale.opening_stock) && selectedSale.opening_stock.map((openingItem, index) => {
                        const closingItem = selectedSale.closing_stock?.find(c => c.product_id === openingItem.product_id);
                        const saleItem = selectedSale.sale?.find(s => s.product_id === openingItem.product_id);
                        const saleQuantity = saleItem ? parseFloat(saleItem.sale || 0) : 0;
                        const salePrice = getProductSalePrice(openingItem.product_id);
                        const totalAmount = saleQuantity * salePrice;

                        return (
                          <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                            <td style={{ padding: '1rem', fontWeight: '700', fontSize: '1rem' }}>{getProductName(openingItem.product_id)}</td>
                            <td style={{
                              padding: '1rem',
                              textAlign: 'center',
                              fontWeight: '700',
                              fontSize: '1.125rem',
                              color: '#2196F3',
                              backgroundColor: index % 2 === 0 ? '#e3f2fd' : '#bbdefb'
                            }}>
                              {parseFloat(openingItem.opening_stock || 0).toFixed(2)}
                            </td>
                            <td style={{
                              padding: '1rem',
                              textAlign: 'center',
                              fontWeight: '700',
                              fontSize: '1.125rem',
                              color: '#ff9800',
                              backgroundColor: index % 2 === 0 ? '#fff3e0' : '#ffe0b2'
                            }}>
                              {closingItem ? parseFloat(closingItem.closing_stock || 0).toFixed(2) : '0.00'}
                            </td>
                            <td style={{
                              padding: '1rem',
                              textAlign: 'center',
                              fontWeight: '700',
                              fontSize: '1.25rem',
                              color: '#4CAF50',
                              backgroundColor: index % 2 === 0 ? '#e8f5e9' : '#c8e6c9'
                            }}>
                              {saleQuantity.toFixed(2)}
                            </td>
                            <td style={{
                              padding: '1rem',
                              textAlign: 'center',
                              fontWeight: '700',
                              fontSize: '1.125rem',
                              color: '#9c27b0'
                            }}>
                              ₹{salePrice.toFixed(2)}
                            </td>
                            <td style={{
                              padding: '1rem',
                              textAlign: 'center',
                              fontWeight: '700',
                              fontSize: '1.25rem',
                              color: '#000',
                              backgroundColor: index % 2 === 0 ? '#fff9c4' : '#fff59d'
                            }}>
                              ₹{totalAmount.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ fontWeight: '700', backgroundColor: '#000', color: 'white' }}>
                        <td colSpan="5" style={{ padding: '1.25rem 1rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Grand Total</td>
                        <td style={{ padding: '1.25rem 1rem', fontSize: '1.5rem', fontWeight: '700', textAlign: 'center' }}>
                          ₹{(() => {
                            let grandTotal = 0;
                            if (selectedSale.opening_stock && Array.isArray(selectedSale.opening_stock)) {
                              selectedSale.opening_stock.forEach(openingItem => {
                                const saleItem = selectedSale.sale?.find(s => s.product_id === openingItem.product_id);
                                const saleQuantity = saleItem ? parseFloat(saleItem.sale || 0) : 0;
                                const salePrice = getProductSalePrice(openingItem.product_id);
                                grandTotal += saleQuantity * salePrice;
                              });
                            }
                            return grandTotal.toFixed(2);
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="mobile-only">
                  {selectedSale.opening_stock && Array.isArray(selectedSale.opening_stock) && selectedSale.opening_stock.map((openingItem, index) => {
                    const closingItem = selectedSale.closing_stock?.find(c => c.product_id === openingItem.product_id);
                    const saleItem = selectedSale.sale?.find(s => s.product_id === openingItem.product_id);
                    const saleQuantity = saleItem ? parseFloat(saleItem.sale || 0) : 0;
                    const salePrice = getProductSalePrice(openingItem.product_id);
                    const totalAmount = saleQuantity * salePrice;

                    return (
                      <div key={index} className="card" style={{ marginBottom: '1rem', border: '2px solid #000', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ padding: '1rem', borderBottom: '2px solid #000', backgroundColor: '#000', color: 'white' }}>
                          <div style={{ fontSize: '1.125rem', fontWeight: '700' }}>{getProductName(openingItem.product_id)}</div>
                        </div>
                        <div style={{ padding: '1rem' }}>
                          <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {/* Opening Stock */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1976d2', fontSize: '0.875rem', fontWeight: '600' }}>
                                <Package size={16} />
                                Opening Stock
                              </div>
                              <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#2196F3' }}>
                                {parseFloat(openingItem.opening_stock || 0).toFixed(2)}
                              </div>
                            </div>
                            {/* Closing Stock */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e65100', fontSize: '0.875rem', fontWeight: '600' }}>
                                <Package size={16} />
                                Closing Stock
                              </div>
                              <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#ff9800' }}>
                                {closingItem ? parseFloat(closingItem.closing_stock || 0).toFixed(2) : '0.00'}
                              </div>
                            </div>
                            {/* Sale */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2e7d32', fontSize: '0.875rem', fontWeight: '600' }}>
                                <TrendingUp size={16} />
                                Sale
                              </div>
                              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#4CAF50' }}>
                                {saleQuantity.toFixed(2)}
                              </div>
                            </div>
                            {/* Sale Price */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#f3e5f5', borderRadius: '8px' }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6a1b9a' }}>
                                Sale Price
                              </div>
                              <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#9c27b0' }}>
                                ₹{salePrice.toFixed(2)}
                              </div>
                            </div>
                            {/* Total */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#fff9c4', borderRadius: '8px', border: '2px solid #f9a825' }}>
                              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#000', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Total
                              </div>
                              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#000' }}>
                                ₹{totalAmount.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Grand Total Card */}
                  <div className="card" style={{ backgroundColor: '#000', color: 'white', padding: '1.5rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Grand Total
                      </div>
                      <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                        ₹{(() => {
                          let grandTotal = 0;
                          if (selectedSale.opening_stock && Array.isArray(selectedSale.opening_stock)) {
                            selectedSale.opening_stock.forEach(openingItem => {
                              const saleItem = selectedSale.sale?.find(s => s.product_id === openingItem.product_id);
                              const saleQuantity = saleItem ? parseFloat(saleItem.sale || 0) : 0;
                              const salePrice = getProductSalePrice(openingItem.product_id);
                              grandTotal += saleQuantity * salePrice;
                            });
                          }
                          return grandTotal.toFixed(2);
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculated Values Section */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#000', fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={24} style={{ color: '#2196F3' }} />
                  Calculated Values | गणना किए गए मान
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  {/* UPI Sales */}
                  <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <CreditCard size={20} />
                      <p style={{ color: 'white', fontSize: '0.875rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>UPI Sales | UPI बिक्री</p>
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                      ₹{(() => {
                        const totalSales = selectedSale.opening_stock?.reduce((total, openingItem) => {
                          const saleItem = selectedSale.sale?.find(s => s.product_id === openingItem.product_id);
                          const saleQuantity = saleItem ? parseFloat(saleItem.sale || 0) : 0;
                          const salePrice = getProductSalePrice(openingItem.product_id);
                          return total + (saleQuantity * salePrice);
                        }, 0) || 0;
                        const cashSales = parseFloat(selectedSale.cash_collected || 0);
                        return (totalSales - cashSales).toFixed(2);
                      })()}
                    </p>
                  </div>

                  {/* Cash Sales */}
                  <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)', color: 'white', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <DollarSign size={20} />
                      <p style={{ color: 'white', fontSize: '0.875rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cash Sales | नकद बिक्री</p>
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                      ₹{parseFloat(selectedSale.cash_collected || 0).toFixed(2)}
                    </p>
                  </div>

                  {/* Total UPI Received */}
                  <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)', color: 'white', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <CreditCard size={20} />
                      <p style={{ color: 'white', fontSize: '0.875rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                        Total UPI Received | कुल UPI प्राप्त
                      </p>
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                      ₹{(() => {
                        const upiSales = parseFloat(selectedSale.upi || 0);
                        const miscUpi = parseFloat(selectedSale.miscellaneous_upi || 0);
                        const creditInBank = (selectedSale.creditTaken || [])
                          .filter(item => item.collectedIn === 'bank_balance')
                          .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
                        return (upiSales + miscUpi + creditInBank).toFixed(2);
                      })()}
                    </p>
                    <p style={{ fontSize: '0.75rem', margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                      (UPI + Extra UPI + Credit in Bank)
                    </p>
                  </div>

                  {/* Total Cash Received */}
                  <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', color: 'white', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <DollarSign size={20} />
                      <p style={{ color: 'white', fontSize: '0.875rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                        Total Cash Received | कुल नकद प्राप्त
                      </p>
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                      ₹{(() => {
                        const cashCollected = parseFloat(selectedSale.cash_collected || 0);
                        const miscCash = parseFloat(selectedSale.miscellaneous_cash || 0);
                        const creditInCash = (selectedSale.creditTaken || [])
                          .filter(item => item.collectedIn === 'cash_balance')
                          .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
                        return (cashCollected).toFixed(2);
                      })()}
                    </p>
                    <p style={{ fontSize: '0.75rem', margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                      (Cash + Extra Cash + Credit in Cash)
                    </p>
                  </div>

                  {/* Gala Balance */}
                  {selectedSale.gala_balance_today > 0 && (
                    <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', padding: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <DollarSign size={20} />
                        <p style={{ color: 'white', fontSize: '0.875rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gala Balance | गाला बैलेंस</p>
                      </div>
                      <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                        ₹{parseFloat(selectedSale.gala_balance_today || 0).toFixed(2)}
                      </p>
                    </div>
                  )}

                  {/* Total Expenses */}
                  {selectedSale.dailyExpenses && selectedSale.dailyExpenses.length > 0 && (
                    <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)', color: 'white', padding: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <TrendingUp size={20} />
                        <p style={{ color: 'white', fontSize: '0.875rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Expenses | कुल खर्च</p>
                      </div>
                      <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                        ₹{selectedSale.dailyExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Collections Breakdown */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#000', fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Wallet size={22} style={{ color: '#2196F3' }} />
                  Collections Breakdown | संग्रह विवरण
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                  <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)', color: 'white', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <DollarSign size={20} />
                      <p style={{ color: 'white', fontSize: '0.875rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cash Collected</p>
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                      ₹{parseFloat(selectedSale.cash_collected || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)', color: 'white', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <CreditCard size={20} />
                      <p style={{ color: 'white', fontSize: '0.875rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>UPI Collected</p>
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                      ₹{parseFloat(selectedSale.upi || 0).toFixed(2)}
                    </p>
                  </div>
                  {selectedSale.miscellaneous_cash > 0 && (
                    <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <Package size={20} />
                        <p style={{ color: 'white', fontSize: '0.875rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Extra (Cash)</p>
                      </div>
                      <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                        ₹{parseFloat(selectedSale.miscellaneous_cash || 0).toFixed(2)}
                      </p>
                    </div>
                  )}
                  {selectedSale.miscellaneous_upi > 0 && (
                    <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', padding: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <CreditCard size={20} />
                        <p style={{ color: 'white', fontSize: '0.875rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Extra (UPI)</p>
                      </div>
                      <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                        ₹{parseFloat(selectedSale.miscellaneous_upi || 0).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Credit Given */}
              {selectedSale.credit && Array.isArray(selectedSale.credit) && selectedSale.credit.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#000', fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={22} style={{ color: '#ff9800' }} />
                    Credit Given
                  </h3>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                    <table className="table" style={{ marginBottom: 0 }}>
                      <thead style={{ backgroundColor: '#ff9800' }}>
                        <tr>
                          <th style={{ color: 'white', padding: '1rem' }}>Credit Holder</th>
                          <th style={{ color: 'white', padding: '1rem' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSale.credit.map((item, index) => (
                          <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                            <td style={{ padding: '0.875rem', fontWeight: '600' }}>{getCreditHolderName(item.credit_holder_id)}</td>
                            <td style={{ padding: '0.875rem', fontWeight: '700', fontSize: '1.125rem', color: '#ff9800' }}>₹{parseFloat(item.creditgiven || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ fontWeight: '700', backgroundColor: '#ff9800', color: 'white' }}>
                          <td style={{ padding: '1rem' }}>Total</td>
                          <td style={{ padding: '1rem', fontSize: '1.25rem' }}>₹{calculateCreditSum(selectedSale).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Credit Collected */}
              {selectedSale.creditTaken && Array.isArray(selectedSale.creditTaken) && selectedSale.creditTaken.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#000', fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={22} style={{ color: '#4CAF50' }} />
                    Credit Collected
                  </h3>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                    <table className="table" style={{ marginBottom: 0 }}>
                      <thead style={{ backgroundColor: '#4CAF50' }}>
                        <tr>
                          <th style={{ color: 'white', padding: '1rem' }}>Credit Holder</th>
                          <th style={{ color: 'white', padding: '1rem' }}>Amount</th>
                          <th style={{ color: 'white', padding: '1rem' }}>Collected In</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSale.creditTaken.map((item, index) => (
                          <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                            <td style={{ padding: '0.875rem', fontWeight: '600' }}>{getCreditHolderName(item.creditHolderId)}</td>
                            <td style={{ padding: '0.875rem', fontWeight: '700', fontSize: '1.125rem', color: '#4CAF50' }}>₹{parseFloat(item.amount || 0).toFixed(2)}</td>
                            <td style={{ padding: '0.875rem', fontWeight: '600' }}>
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                backgroundColor: item.collectedIn === 'cash_balance' ? '#fff3e0' : '#e3f2fd',
                                color: item.collectedIn === 'cash_balance' ? '#e65100' : '#1976d2',
                                fontSize: '0.875rem',
                                fontWeight: '600'
                              }}>
                                {item.collectedIn === 'cash_balance' ? 'Cash' : item.collectedIn === 'bank_balance' ? 'Bank' : 'Gala'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ fontWeight: '700', backgroundColor: '#4CAF50', color: 'white' }}>
                          <td style={{ padding: '1rem' }}>Total</td>
                          <td colSpan="2" style={{ padding: '1rem', fontSize: '1.25rem' }}>
                            ₹{selectedSale.creditTaken.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Daily Expenses */}
              {selectedSale.dailyExpenses && Array.isArray(selectedSale.dailyExpenses) && selectedSale.dailyExpenses.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#000', fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DollarSign size={22} style={{ color: '#f44336' }} />
                    Daily Expenses
                  </h3>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                    <table className="table" style={{ marginBottom: 0 }}>
                      <thead style={{ backgroundColor: '#f44336' }}>
                        <tr>
                          <th style={{ color: 'white', padding: '1rem' }}>Expense Name</th>
                          <th style={{ color: 'white', padding: '1rem' }}>Description</th>
                          <th style={{ color: 'white', padding: '1rem' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSale.dailyExpenses.map((expense, index) => (
                          <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                            <td style={{ padding: '0.875rem', fontWeight: '600' }}>{expense.name}</td>
                            <td style={{ padding: '0.875rem', color: '#666' }}>{expense.description || '-'}</td>
                            <td style={{ padding: '0.875rem', fontWeight: '700', fontSize: '1.125rem', color: '#f44336' }}>₹{parseFloat(expense.amount || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ fontWeight: '700', backgroundColor: '#f44336', color: 'white' }}>
                          <td colSpan="2" style={{ padding: '1rem' }}>Total</td>
                          <td style={{ padding: '1rem', fontSize: '1.25rem' }}>
                            ₹{selectedSale.dailyExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Balance Allocation */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#000', fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <DollarSign size={22} style={{ color: '#2196F3' }} />
                  Balance Allocation
                </h3>
                {selectedSale.balances ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                    <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)', color: 'white', padding: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <DollarSign size={20} />
                        <p style={{ color: 'white', fontSize: '0.875rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cash Balance</p>
                      </div>
                      <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                        ₹{parseFloat(selectedSale.balances.cash_balance || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)', color: 'white', padding: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <CreditCard size={20} />
                        <p style={{ color: 'white', fontSize: '0.875rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bank Balance</p>
                      </div>
                      <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                        ₹{parseFloat(selectedSale.balances.bank_balance || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', padding: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <DollarSign size={20} />
                        <p style={{ color: 'white', fontSize: '0.875rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gala Balance</p>
                      </div>
                      <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', margin: 0 }}>
                        ₹{parseFloat(selectedSale.balances.gala_balance || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="card" style={{
                    padding: '2rem',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
                    border: '2px dashed #d63031',
                    borderRadius: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <AlertCircle size={24} style={{ color: '#d63031' }} />
                      <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#d63031', margin: 0 }}>
                        No Allocation Done
                      </p>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#2d3436', margin: 0 }}>
                      Balance has not been allocated for this sale yet.
                    </p>
                  </div>
                )}
              </div>

              {/* Remarks */}
              {selectedSale.remarks && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#000', fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare size={22} style={{ color: '#9c27b0' }} />
                    Remarks
                  </h3>
                  <div style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                    borderRadius: '12px',
                    border: '2px solid #9c27b0',
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    color: '#333'
                  }}>
                    {selectedSale.remarks}
                  </div>
                </div>
              )}

              {/* Total Summary */}
              <div className="card" style={{
                background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                color: 'white',
                padding: '2rem',
                textAlign: 'center',
                boxShadow: '0 8px 24px rgba(33, 150, 243, 0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <FileText size={28} />
                  <h3 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: 'white', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Total Collection
                  </h3>
                </div>
                <p style={{ fontSize: '3rem', fontWeight: '700', margin: 0 }}>
                  ₹{(parseFloat(selectedSale.cash_collected || 0) +
                     parseFloat(selectedSale.upi || 0)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && approvalSale && approvalForm.productData && (
        <div
          className="modal-overlay"
          onClick={handleCloseApprovalModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 2000,
            overflowY: 'auto',
            padding: '2rem 1rem'
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              maxWidth: '1200px',
              width: '100%',
              marginBottom: '2rem'
            }}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
              color: '#000',
              padding: '2rem',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              position: 'relative'
            }}>

              <h3 style={{ color: '#000', margin: 0, fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertCircle size={28} />
                Review & Approve Sale
              </h3>
              <p style={{ color: 'rgba(0, 0, 0, 0.8)', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                {new Date(approvalSale.date).toLocaleDateString()} - {approvalSale.username || 'N/A'}
              </p>
            </div>

            <div style={{ padding: '2rem', maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
              {approvalError && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  border: '1px solid #f5c6cb'
                }}>
                  {approvalError}
                </div>
              )}

              {/* Date */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem' }}>Sale Date</h4>
                <input
                  type="date"
                  className="form-control"
                  value={approvalForm.date}
                  onChange={(e) => setApprovalForm({ ...approvalForm, date: e.target.value })}
                  style={{
                    fontSize: '1.125rem',
                    padding: '0.75rem',
                    backgroundColor: '#f5f5f5',
                    cursor: 'not-allowed'
                  }}
                  disabled={true}
                />
                <small style={{ color: '#666', display: 'block', marginTop: '0.5rem' }}>
                  Date cannot be changed during review
                </small>
              </div>

              {/* Products Table */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem' }}>Product Sales</h4>
                {/* Desktop View */}
                <div className="desktop-only" style={{ overflowX: 'auto', border: '2px solid #e0e0e0', borderRadius: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#000', color: 'white' }}>
                      <tr>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem' }}>Product</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem' }}>Opening Stock</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem' }}>Closing Stock</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem' }}>Sale</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem' }}>Sale Price</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem' }}>Sale Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product, index) => {
                        const productData = approvalForm.productData[product.id] || { openingStock: 0, closingStock: 0, sale: 0 };
                        const saleQuantity = parseFloat(productData.sale) || 0;
                        const salePrice = parseFloat(product.sale_price) || 0;
                        const saleValue = saleQuantity * salePrice;

                        return (
                          <tr key={product.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                            <td style={{ padding: '0.75rem', fontWeight: '600' }}>{product.product_name}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                              <input
                                type="number"
                                value={productData.openingStock}
                                readOnly
                                style={{
                                  width: '100px',
                                  padding: '0.5rem',
                                  border: '2px solid #e0e0e0',
                                  borderRadius: '6px',
                                  textAlign: 'center',
                                  backgroundColor: '#f5f5f5',
                                  fontWeight: '600'
                                }}
                              />
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                              <input
                                type="number"
                                value={productData.closingStock}
                                onChange={(e) => handleProductChangeInApproval(product.id, 'closingStock', e.target.value)}
                                step="1"
                                min="0"
                                style={{
                                  width: '100px',
                                  padding: '0.5rem',
                                  border: '2px solid #4CAF50',
                                  borderRadius: '6px',
                                  textAlign: 'center',
                                  fontWeight: '600'
                                }}
                              />
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                              <input
                                type="number"
                                value={productData.sale}
                                onChange={(e) => handleProductChangeInApproval(product.id, 'sale', e.target.value)}
                                step="1"
                                min="0"
                                style={{
                                  width: '100px',
                                  padding: '0.5rem',
                                  border: '2px solid #2196F3',
                                  borderRadius: '6px',
                                  textAlign: 'center',
                                  fontWeight: '600',
                                  color: '#2196F3'
                                }}
                              />
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#9c27b0', fontSize: '1rem' }}>
                              ₹{salePrice.toFixed(2)}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '700', color: '#2e7d32', fontSize: '1.125rem' }}>
                              ₹{saleValue.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#fff3e0', fontWeight: '700' }}>
                        <td colSpan="5" style={{ padding: '1rem', textAlign: 'right', fontSize: '1rem', color: '#e65100' }}>
                          Total Sale Value
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontSize: '1.25rem', color: '#e65100' }}>
                          ₹{(() => {
                            let total = 0;
                            products.forEach(product => {
                              const productData = approvalForm.productData[product.id] || { sale: 0 };
                              const saleQuantity = parseFloat(productData.sale) || 0;
                              const salePrice = parseFloat(product.sale_price) || 0;
                              total += saleQuantity * salePrice;
                            });
                            return total.toFixed(2);
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="mobile-only">
                  {products.map((product, index) => {
                    const productData = approvalForm.productData[product.id] || { openingStock: 0, closingStock: 0, sale: 0 };
                    const saleQuantity = parseFloat(productData.sale) || 0;
                    const salePrice = parseFloat(product.sale_price) || 0;
                    const saleValue = saleQuantity * salePrice;

                    return (
                      <div key={product.id} className="card" style={{ marginBottom: '1rem', border: '2px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ padding: '0.75rem', borderBottom: '2px solid #000', backgroundColor: '#000', color: 'white' }}>
                          <div style={{ fontSize: '1rem', fontWeight: '700' }}>{product.product_name}</div>
                        </div>
                        <div style={{ padding: '1rem' }}>
                          <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {/* Opening Stock */}
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                                Opening Stock
                              </label>
                              <input
                                type="number"
                                value={productData.openingStock}
                                readOnly
                                style={{
                                  width: '100%',
                                  padding: '0.75rem',
                                  border: '2px solid #e0e0e0',
                                  borderRadius: '8px',
                                  textAlign: 'center',
                                  backgroundColor: '#f5f5f5',
                                  fontWeight: '700',
                                  fontSize: '1.125rem',
                                  color: '#2196F3'
                                }}
                              />
                            </div>
                            {/* Closing Stock */}
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                                Closing Stock
                              </label>
                              <input
                                type="number"
                                value={productData.closingStock}
                                onChange={(e) => handleProductChangeInApproval(product.id, 'closingStock', e.target.value)}
                                step="1"
                                min="0"
                                style={{
                                  width: '100%',
                                  padding: '0.75rem',
                                  border: '2px solid #4CAF50',
                                  borderRadius: '8px',
                                  textAlign: 'center',
                                  fontWeight: '700',
                                  fontSize: '1.125rem',
                                  color: '#ff9800'
                                }}
                              />
                            </div>
                            {/* Sale */}
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                                Sale
                              </label>
                              <input
                                type="number"
                                value={productData.sale}
                                onChange={(e) => handleProductChangeInApproval(product.id, 'sale', e.target.value)}
                                step="1"
                                min="0"
                                style={{
                                  width: '100%',
                                  padding: '0.75rem',
                                  border: '2px solid #2196F3',
                                  borderRadius: '8px',
                                  textAlign: 'center',
                                  fontWeight: '700',
                                  fontSize: '1.25rem',
                                  color: '#2196F3'
                                }}
                              />
                            </div>
                            {/* Sale Price */}
                            <div style={{ padding: '0.75rem', backgroundColor: '#f3e5f5', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6a1b9a' }}>Sale Price</span>
                              <span style={{ fontSize: '1.125rem', fontWeight: '700', color: '#9c27b0' }}>₹{salePrice.toFixed(2)}</span>
                            </div>
                            {/* Sale Value */}
                            <div style={{ padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '2px solid #4CAF50' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '1rem', fontWeight: '700', color: '#2e7d32', textTransform: 'uppercase' }}>Sale Value</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2e7d32' }}>₹{saleValue.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Total Sale Value Card */}
                  <div className="card" style={{ backgroundColor: '#fff3e0', border: '2px solid #e65100', padding: '1.25rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#e65100', textTransform: 'uppercase' }}>
                        Total Sale Value
                      </div>
                      <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#e65100' }}>
                        ₹{(() => {
                          let total = 0;
                          products.forEach(product => {
                            const productData = approvalForm.productData[product.id] || { sale: 0 };
                            const saleQuantity = parseFloat(productData.sale) || 0;
                            const salePrice = parseFloat(product.sale_price) || 0;
                            total += saleQuantity * salePrice;
                          });
                          return total.toFixed(2);
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* UPI & Gala Balance */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem' }}>UPI & Gala Balance</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.875rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
                      Total UPI Received Today | आज कुल UPI प्राप्त
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={approvalForm.upiTotal || 0}
                      onChange={(e) => setApprovalForm({ ...approvalForm, upiTotal: e.target.value })}
                      step="1"
                      min="0"
                      style={{ fontSize: '1.125rem', padding: '0.75rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Miscellaneous */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem' }}>Extra (Chakhna, Bag, etc) | अतिरिक्त</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.875rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
                      Cash
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={approvalForm.miscellaneousCash || 0}
                      onChange={(e) => setApprovalForm({ ...approvalForm, miscellaneousCash: e.target.value })}
                      step="1"
                      min="0"
                      style={{ fontSize: '1.125rem', padding: '0.75rem' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.875rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
                      UPI
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={approvalForm.miscellaneousUPI || 0}
                      onChange={(e) => setApprovalForm({ ...approvalForm, miscellaneousUPI: e.target.value })}
                      step="1"
                      min="0"
                      style={{ fontSize: '1.125rem', padding: '0.75rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Credit Collected */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: '700', margin: 0 }}>Credit Collected (Collect on Shop) | उधार वसूली</h4>
                  <button
                    type="button"
                    onClick={addCreditTakenInApproval}
                    className="btn btn-success"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    + Add Credit Collected
                  </button>
                </div>

                {(approvalForm.creditTaken || []).map((entry, index) => {
                  const selectedHolder = creditHolders.find(ch => String(ch.id) === String(entry.creditHolderId));
                  const currentOutstanding = selectedHolder ? parseFloat(selectedHolder.amount_payable || 0) : 0;
                  const amountCollecting = parseFloat(entry.amount || 0);
                  const newOutstanding = Math.max(0, currentOutstanding - amountCollecting);

                  return (
                    <div key={index} style={{ marginBottom: '1rem', padding: '1rem', border: '2px solid #e0e0e0', borderRadius: '8px', background: '#f9f9f9' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Credit Holder</label>
                            <select
                              className="form-control"
                              value={entry.creditHolderId}
                              onChange={(e) => updateCreditTakenInApproval(index, 'creditHolderId', e.target.value)}
                            >
                              <option value="">Select</option>
                              {creditHolders.map(ch => (
                                <option key={ch.id} value={ch.id}>{ch.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Amount</label>
                            <input
                              type="number"
                              className="form-control"
                              value={entry.amount}
                              onChange={(e) => updateCreditTakenInApproval(index, 'amount', e.target.value)}
                              step="1"
                              min="0"
                              placeholder="₹ 0.00"
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Collected In</label>
                            <select
                              className="form-control"
                              value={entry.collectedIn}
                              onChange={(e) => updateCreditTakenInApproval(index, 'collectedIn', e.target.value)}
                            >
                              <option value="cash_balance">Cash</option>
                              <option value="bank_balance">UPI</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeCreditTakenInApproval(index)}
                            className="btn btn-danger"
                            style={{ padding: '0.5rem 1rem' }}
                          >
                            Remove
                          </button>
                        </div>

                        {entry.creditHolderId && (
                          <div style={{ padding: '0.75rem', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #2196f3' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#1565c0', fontWeight: '600' }}>Current Outstanding:</span>
                              <span style={{ fontSize: '1rem', fontWeight: '700', color: '#0d47a1' }}>₹{currentOutstanding.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.25rem', borderTop: '1px solid #90caf9' }}>
                              <span style={{ fontSize: '0.75rem', color: '#1565c0', fontWeight: '600' }}>After Collection:</span>
                              <span style={{ fontSize: '1rem', fontWeight: '700', color: '#2e7d32' }}>₹{newOutstanding.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {(!approvalForm.creditTaken || approvalForm.creditTaken.length === 0) && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#666', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                    No credit Collected entries. Click "Add Credit Collected" to add one.
                  </div>
                )}
              </div>

              {/* Daily Expenses */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: '700', margin: 0 }}>Daily Expenses (From Gala) | दैनिक खर्चे</h4>
                  <button
                    type="button"
                    onClick={addDailyExpenseInApproval}
                    className="btn btn-success"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    + Add Expense
                  </button>
                </div>

                {/* Expense Validation */}
                {(() => {
                  const totals = calculateApprovaTotals();
                  const totalExpenses = (approvalForm.dailyExpenses || []).reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
                  const galaBalanceValue = parseFloat(approvalForm.galaBalanceToday || 0);
                  const maxAllowed = Math.max(0, galaBalanceValue + totals.cashSales + totals.creditTakenCash - totals.totalCreditGiven);
                  const isExceeding = totalExpenses > maxAllowed;

                  return (
                    <div style={{
                      marginBottom: '1rem',
                      padding: '1rem',
                      backgroundColor: isExceeding ? '#f8d7da' : '#e3f2fd',
                      borderRadius: '8px',
                      border: `2px solid ${isExceeding ? '#dc3545' : '#2196f3'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: isExceeding ? '#721c24' : '#1565c0', fontWeight: '600' }}>
                          Available Funds (Gala + Cash Sales + Credit Collected Cash - Credit Given):
                        </span>
                        <span style={{ fontSize: '1rem', fontWeight: '700', color: isExceeding ? '#721c24' : '#0d47a1' }}>
                          ₹{maxAllowed.toFixed(2)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: `1px solid ${isExceeding ? '#f5c6cb' : '#90caf9'}` }}>
                        <span style={{ fontSize: '0.75rem', color: isExceeding ? '#721c24' : '#1565c0', fontWeight: '600' }}>
                          Total Expenses:
                        </span>
                        <span style={{ fontSize: '1rem', fontWeight: '700', color: isExceeding ? '#dc3545' : '#2e7d32' }}>
                          ₹{totalExpenses.toFixed(2)}
                        </span>
                      </div>
                      {isExceeding && (
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#856404', fontWeight: '600' }}>
                            ⚠️ Warning: Total expenses exceed available funds by ₹{(totalExpenses - maxAllowed).toFixed(2)}!
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {(approvalForm.dailyExpenses || []).map((expense, index) => (
                  <div key={index} style={{ marginBottom: '1rem', padding: '1rem', border: '2px solid #e0e0e0', borderRadius: '8px', background: '#f9f9f9' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={expense.name}
                          onChange={(e) => updateDailyExpenseInApproval(index, 'name', e.target.value)}
                          placeholder="e.g., Electricity"
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Description</label>
                        <input
                          type="text"
                          className="form-control"
                          value={expense.description}
                          onChange={(e) => updateDailyExpenseInApproval(index, 'description', e.target.value)}
                          placeholder="Optional details"
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Amount</label>
                        <input
                          type="number"
                          className="form-control"
                          value={expense.amount}
                          onChange={(e) => updateDailyExpenseInApproval(index, 'amount', e.target.value)}
                          step="1"
                          min="0"
                          placeholder="₹ 0.00"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeDailyExpenseInApproval(index)}
                        className="btn btn-danger"
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {(!approvalForm.dailyExpenses || approvalForm.dailyExpenses.length === 0) && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#666', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                    No expense entries. Click "Add Expense" to add one.
                  </div>
                )}
              </div>

              {/* Credit */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: '700', margin: 0 }}>Credit Given</h4>
                  <button
                    type="button"
                    onClick={addCreditEntryInApproval}
                    className="btn btn-success"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    + Add Credit
                  </button>
                </div>

                {(approvalForm.creditEntries || []).map((entry, index) => {
                  const selectedHolder = creditHolders.find(ch => String(ch.id) === String(entry.creditHolderId));
                  const currentOutstanding = selectedHolder ? parseFloat(selectedHolder.amount_payable || 0) : 0;
                  const amountGiving = parseFloat(entry.amount || 0);
                  const newOutstanding = currentOutstanding + amountGiving;

                  return (
                    <div key={index} style={{ marginBottom: '1rem', padding: '1rem', border: '2px solid #e0e0e0', borderRadius: '8px', background: '#f9f9f9' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Credit Holder</label>
                            <select
                              className="form-control"
                              value={entry.creditHolderId}
                              onChange={(e) => updateCreditEntryInApproval(index, 'creditHolderId', e.target.value)}
                            >
                              <option value="">Select</option>
                              {creditHolders.map(ch => (
                                <option key={ch.id} value={ch.id}>{ch.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Amount</label>
                            <input
                              type="number"
                              className="form-control"
                              value={entry.amount}
                              onChange={(e) => updateCreditEntryInApproval(index, 'amount', e.target.value)}
                              step="1"
                              min="0"
                              placeholder="₹ 0.00"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeCreditEntryInApproval(index)}
                            className="btn btn-danger"
                            style={{ padding: '0.5rem 1rem' }}
                          >
                            Remove
                          </button>
                        </div>

                        {entry.creditHolderId && (
                          <div style={{ padding: '0.75rem', backgroundColor: '#fff3e0', borderRadius: '8px', border: '1px solid #ff9800' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#e65100', fontWeight: '600' }}>Current Outstanding:</span>
                              <span style={{ fontSize: '1rem', fontWeight: '700', color: '#e65100' }}>₹{currentOutstanding.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.25rem', borderTop: '1px solid #ffb74d' }}>
                              <span style={{ fontSize: '0.75rem', color: '#e65100', fontWeight: '600' }}>After Giving Credit:</span>
                              <span style={{ fontSize: '1rem', fontWeight: '700', color: '#d32f2f' }}>₹{newOutstanding.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {(!approvalForm.creditEntries || approvalForm.creditEntries.length === 0) && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#666', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                    No credit entries. Click "Add Credit" to add one.
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem' }}>Remarks</h4>
                <textarea
                  className="form-control"
                  value={approvalForm.remarks || ''}
                  onChange={(e) => setApprovalForm({ ...approvalForm, remarks: e.target.value })}
                  rows="3"
                  style={{ fontSize: '1rem', padding: '0.75rem' }}
                  placeholder="Enter any remarks (optional)"
                />
              </div>

              {/* Calculated Values */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem' }}>Calculated Values | गणना किए गए मान</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '2px solid #4caf50' }}>
                    <div style={{ fontSize: '0.875rem', color: '#2e7d32', marginBottom: '0.25rem' }}>UPI Sales | UPI बिक्री</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1b5e20' }}>
                      ₹{calculateApprovaTotals().upiSales.toFixed(2)}
                    </div>
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '2px solid #2196f3' }}>
                    <div style={{ fontSize: '0.875rem', color: '#1565c0', marginBottom: '0.25rem' }}>Cash Sales | नकद बिक्री</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0d47a1' }}>
                      ₹{calculateApprovaTotals().cashSales.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '1.5rem', backgroundColor: '#fff3e0', borderRadius: '8px', border: '3px solid #ff9800' }}>
                  <div style={{ fontSize: '1rem', color: '#e65100', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Cash Collected | नकद एकत्रित
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#e65100' }}>
                    ₹{calculateApprovaTotals().cashCollected.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div style={{
                padding: '1rem',
                backgroundColor: '#fff3cd',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid #ffc107'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#856404' }}>
                  <strong>Warning:</strong> Approving this sale will update inventory and credit holders. This action cannot be undone.
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleApproveSale}
                  style={{ flex: 1, padding: '1rem', fontSize: '1rem', fontWeight: '600', background: '#4CAF50' }}
                >
                  Approve Sale
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleCloseApprovalModal}
                  style={{ flex: 1, padding: '1rem', fontSize: '1rem' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .desktop-only {
            display: block !important;
          }
          .mobile-only {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .desktop-only {
            display: none !important;
          }
          .mobile-only {
            display: block !important;
          }

          /* Modal Optimizations for Mobile */
          .modal-overlay {
            padding: 0.5rem !important;
            align-items: flex-start !important;
          }

          .modal {
            max-width: 100% !important;
            max-height: 95vh !important;
            margin: 0.5rem 0 !important;
          }

          /* Modal Headers */
          .modal h3,
          .modal h2 {
            font-size: clamp(1.125rem, 4vw, 1.5rem) !important;
          }

          .modal h4 {
            font-size: clamp(1rem, 3.5vw, 1.125rem) !important;
          }

          /* Modal Padding */
          .modal > div[style*="padding: 2rem"],
          .modal > div > div[style*="padding: 2rem"] {
            padding: 1rem !important;
          }

          /* Grid Layouts - Stack on Mobile */
          .modal div[style*="gridTemplateColumns: 'repeat(2, 1fr')"],
          .modal div[style*="gridTemplateColumns: repeat(2, 1fr)"],
          .modal div[style*="gridTemplateColumns: 'repeat(auto-fit"],
          .modal div[style*="gridTemplateColumns: repeat(auto-fit"] {
            grid-template-columns: 1fr !important;
          }

          /* Dynamic Entry Grids (Credit Collected, Daily Expenses, Credit Given) */
          .modal div[style*="gridTemplateColumns: '2fr 1fr 1fr auto'"],
          .modal div[style*="gridTemplateColumns: 2fr 1fr 1fr auto"],
          .modal div[style*="gridTemplateColumns: '1fr 2fr 1fr auto'"],
          .modal div[style*="gridTemplateColumns: 1fr 2fr 1fr auto"],
          .modal div[style*="gridTemplateColumns: '2fr 1fr auto'"],
          .modal div[style*="gridTemplateColumns: 2fr 1fr auto"] {
            grid-template-columns: 1fr !important;
          }

          /* Button Containers */
          .modal div[style*="display: 'flex'"][style*="gap: '1rem'"] button,
          .modal div[style*="display: flex"][style*="gap: 1rem"] button {
            font-size: 0.9375rem !important;
            padding: 0.875rem !important;
          }

          /* Close Button in Header */
          .modal button[style*="position: absolute"][style*="top: '1rem'"],
          .modal button[style*="position: absolute"][style*="top: 1rem"],
          .modal button[style*="position: absolute"][style*="top: '1.5rem'"],
          .modal button[style*="position: absolute"][style*="top: 1.5rem"] {
            top: 0.75rem !important;
            right: 0.75rem !important;
            width: 32px !important;
            height: 32px !important;
          }

          /* Form Controls */
          .modal .form-control {
            font-size: 1rem !important;
            padding: 0.75rem !important;
          }

          .modal select.form-control {
            padding: 0.75rem 0.5rem !important;
          }

          .modal textarea.form-control {
            min-height: 100px !important;
          }

          /* Input Fields with Large Font Sizes */
          .modal input[style*="fontSize: '1.25rem'"],
          .modal input[style*="fontSize: 1.25rem"],
          .modal input[style*="fontSize: '1.125rem'"],
          .modal input[style*="fontSize: 1.125rem"] {
            font-size: 1rem !important;
            padding: 0.75rem 0.5rem !important;
          }

          /* Table Horizontal Scroll */
          .modal div[style*="overflowX: 'auto'"],
          .modal div[style*="overflowX: auto"],
          .modal div[style*="overflow-x: auto"] {
            -webkit-overflow-scrolling: touch !important;
          }

          .modal table {
            min-width: 700px !important;
            font-size: 0.875rem !important;
          }

          .modal table th,
          .modal table td {
            padding: 0.5rem !important;
            font-size: 0.8125rem !important;
          }

          .modal table input {
            width: 70px !important;
            padding: 0.375rem !important;
            font-size: 0.875rem !important;
          }

          /* Product Sales Table in Approval Modal */
          .modal table thead th[style*="fontSize: '0.875rem'"],
          .modal table thead th[style*="fontSize: 0.875rem"] {
            font-size: 0.75rem !important;
            padding: 0.625rem 0.375rem !important;
          }

          .modal table tbody td {
            padding: 0.5rem 0.375rem !important;
          }

          /* Collection Cards and Summary Cards */
          .modal .card {
            padding: 1rem !important;
          }

          .modal .card[style*="padding: '1.5rem'"],
          .modal .card[style*="padding: 1.5rem"],
          .modal .card[style*="padding: '2rem'"],
          .modal .card[style*="padding: 2rem"] {
            padding: 1rem !important;
          }

          .modal .card p[style*="fontSize: '2rem'"],
          .modal .card p[style*="fontSize: 2rem"],
          .modal .card p[style*="fontSize: '3rem'"],
          .modal .card p[style*="fontSize: 3rem"] {
            font-size: clamp(1.5rem, 6vw, 2.5rem) !important;
          }

          .modal .card div[style*="fontSize: '1.5rem'"],
          .modal .card div[style*="fontSize: 1.5rem"],
          .modal .card div[style*="fontSize: '2rem'"],
          .modal .card div[style*="fontSize: 2rem"] {
            font-size: clamp(1.25rem, 5vw, 1.75rem) !important;
          }

          /* Labels */
          .modal label {
            font-size: 0.875rem !important;
            margin-bottom: 0.375rem !important;
          }

          /* Info Boxes and Alerts */
          .modal div[style*="backgroundColor: '#e3f2fd'"],
          .modal div[style*="backgroundColor: '#fff3e0'"],
          .modal div[style*="backgroundColor: '#fff3cd'"],
          .modal div[style*="backgroundColor: '#f8d7da'"],
          .modal div[style*="backgroundColor: #e3f2fd"],
          .modal div[style*="backgroundColor: #fff3e0"],
          .modal div[style*="backgroundColor: #fff3cd"],
          .modal div[style*="backgroundColor: #f8d7da"] {
            padding: 0.75rem !important;
            font-size: 0.8125rem !important;
          }

          /* Outstanding/Balance Info in Entry Cards */
          .modal div[style*="fontSize: '1rem'"][style*="fontWeight: '700'"] {
            font-size: 0.9375rem !important;
          }

          .modal div[style*="fontSize: '0.75rem'"] {
            font-size: 0.6875rem !important;
          }

          /* Summary Stats Grids */
          .modal div[style*="background: linear-gradient"][style*="padding: '1.5rem'"],
          .modal div[style*="background: linear-gradient"][style*="padding: 1.5rem"] {
            padding: 1rem !important;
          }

          /* Add/Remove Buttons in Dynamic Sections */
          .modal button[style*="padding: '0.5rem 1rem'"],
          .modal button[style*="padding: 0.5rem 1rem"] {
            padding: 0.625rem 0.875rem !important;
            font-size: 0.875rem !important;
          }

          /* Entry Card Containers */
          .modal div[style*="padding: '1rem'"][style*="border: '2px solid #e0e0e0'"],
          .modal div[style*="padding: 1rem"][style*="border: 2px solid #e0e0e0"] {
            padding: 0.875rem !important;
          }

          /* Detailed Sales Modal - Basic Info Grid */
          .modal div[style*="gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr'))"],
          .modal div[style*="gridTemplateColumns: repeat(auto-fit, minmax(200px, 1fr))"] {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }

          /* Responsive Font Sizes for Large Text */
          .modal span[style*="fontSize: '1.125rem'"],
          .modal span[style*="fontSize: 1.125rem"],
          .modal span[style*="fontSize: '1.25rem'"],
          .modal span[style*="fontSize: 1.25rem"] {
            font-size: 1rem !important;
          }

          /* Ensure Buttons Stack Properly */
          .modal > div > div:last-child div[style*="display: flex"][style*="gap"] {
            flex-direction: column !important;
            gap: 0.75rem !important;
          }

          .modal > div > div:last-child div[style*="display: flex"][style*="gap"] button {
            width: 100% !important;
          }
        }
      `}</style>
    </>
  );
};

export default SalesReportTab;
