const db = require('../models/data');
const pool = require('../config/database');
const { createTimer } = require('../utils/timing');

const getMonthlyAnalytics = async (req, res) => {
  const timer = createTimer('GET /api/analytics/monthly');
  try {
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    // Get all approved sales for this organization
    const sales = await timer.measureDb(() => db.getSalesByOrganisationId(organisationId));
    const approvedSales = sales.filter(sale => sale.status === 'approved');

    console.log('=== ANALYTICS DEBUG ===');
    console.log('Total sales:', sales.length);
    console.log('Approved sales:', approvedSales.length);
    if (approvedSales.length > 0) {
      console.log('Sample approved sale:', {
        date: approvedSales[0].date,
        status: approvedSales[0].status,
        sale: approvedSales[0].sale
      });
    }

    // Get all orders for this organization
    const orders = await timer.measureDb(() => db.getOrdersByOrganisationId(organisationId));
    console.log('Total orders:', orders.length);
    if (orders.length > 0) {
      console.log('Sample order:', {
        order_date: orders[0].order_date,
        distributor_id: orders[0].distributor_id,
        order_data: orders[0].order_data
      });
    }

    // Get all products for this organization
    const products = await timer.measureDb(() => db.getProductsByOrganisationId(organisationId));
    console.log('Total products:', products.length);

    // Get all distributors for this organization
    const distributors = await timer.measureDb(() => db.getDistributorsByOrganisationId(organisationId));
    console.log('Total distributors:', distributors.length);

    // Get all credit holders for this organization
    const creditHolders = await timer.measureDb(() => db.getCreditHoldersByOrganisationId(organisationId));
    console.log('Total credit holders:', creditHolders.length);

    // Get credit collection history to track outstanding over time
    const creditHistoryQuery = await timer.measureDb(() => pool.query(
      `SELECT * FROM credit_collection_history
       WHERE organisation_id = $1
       ORDER BY collected_at ASC`,
      [organisationId]
    ));
    const creditHistory = creditHistoryQuery.rows;

    // Helper function to format date to YYYY-MM
    const formatMonth = (date) => {
      if (!date) return null;
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    };

    // Find the earliest date from sales
    let earliestDate = null;
    if (approvedSales.length > 0) {
      earliestDate = new Date(Math.min(...approvedSales.map(s => new Date(s.date))));
    }
    if (orders.length > 0) {
      const earliestOrderDate = new Date(Math.min(...orders.map(o => new Date(o.order_date))));
      if (!earliestDate || earliestOrderDate < earliestDate) {
        earliestDate = earliestOrderDate;
      }
    }

    // If no data, return empty arrays
    if (!earliestDate) {
      return res.json({
        monthlySales: [],
        distributorOrders: [],
        creditOutstanding: [],
        productSales: []
      });
    }

    // Generate list of months from earliest date to current month
    const currentDate = new Date();
    const months = [];
    let tempDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    while (tempDate <= currentDate) {
      months.push(formatMonth(tempDate));
      tempDate.setMonth(tempDate.getMonth() + 1);
    }

    // 1. Calculate monthly total sales
    const monthlySalesMap = {};
    months.forEach(month => {
      monthlySalesMap[month] = 0;
    });

    approvedSales.forEach(sale => {
      const month = formatMonth(sale.date);
      if (month && monthlySalesMap.hasOwnProperty(month)) {
        // Calculate total sale amount
        let totalSale = 0;
        if (Array.isArray(sale.sale)) {
          sale.sale.forEach(item => {
            const saleQty = parseFloat(item.sale || 0);
            const product = products.find(p => p.id === item.product_id);
            if (product) {
              totalSale += saleQty * parseFloat(product.sale_price || 0);
            }
          });
        }
        monthlySalesMap[month] += totalSale;
      }
    });

    const monthlySales = months.map(month => ({
      month,
      totalSales: Math.round(monthlySalesMap[month])
    }));

    // 2. Calculate distributor orders per month
    const distributorOrdersMap = {};

    distributors.forEach(distributor => {
      distributorOrdersMap[distributor.id] = {
        name: distributor.name,
        data: {}
      };
      months.forEach(month => {
        distributorOrdersMap[distributor.id].data[month] = 0;
      });
    });

    orders.forEach(order => {
      const month = formatMonth(order.order_date);
      if (month && order.distributor_id && distributorOrdersMap[order.distributor_id]) {
        // Calculate total order value
        let totalOrderValue = 0;
        if (Array.isArray(order.order_data)) {
          order.order_data.forEach(item => {
            // Use the total field if available, otherwise calculate from qty * buy_price
            if (item.total) {
              totalOrderValue += parseFloat(item.total || 0);
            } else {
              const qty = parseFloat(item.qty || 0);
              const buyPrice = parseFloat(item.buy_price || 0);
              totalOrderValue += qty * buyPrice;
            }
          });
        }
        // Add tax, misc, tcs, tds and subtract discount and scheme
        totalOrderValue += parseFloat(order.tax || 0);
        totalOrderValue += parseFloat(order.misc || 0);
        totalOrderValue += parseFloat(order.tcs || 0);
        totalOrderValue += parseFloat(order.tds || 0);
        totalOrderValue -= parseFloat(order.discount || 0);
        totalOrderValue -= parseFloat(order.scheme || 0);

        distributorOrdersMap[order.distributor_id].data[month] += totalOrderValue;
      }
    });

    const distributorOrders = months.map(month => {
      const monthData = { month };
      Object.keys(distributorOrdersMap).forEach(distributorId => {
        const distributor = distributorOrdersMap[distributorId];
        monthData[distributor.name] = Math.round(distributor.data[month]);
      });
      return monthData;
    });

    // 3. Calculate credit outstanding per month for each credit holder
    const creditHolderOutstandingMap = {};

    creditHolders.forEach(holder => {
      creditHolderOutstandingMap[holder.id] = {
        name: holder.name,
        data: {}
      };
      months.forEach(month => {
        creditHolderOutstandingMap[holder.id].data[month] = 0;
      });
    });

    // Track running outstanding for each credit holder
    const runningOutstandingByHolder = {};
    creditHolders.forEach(holder => {
      runningOutstandingByHolder[holder.id] = 0;
    });

    // Process credit history chronologically for each credit holder
    creditHistory.forEach(entry => {
      const month = formatMonth(entry.collected_at);
      const holderId = entry.credit_holder_id;

      if (month && months.includes(month) && creditHolderOutstandingMap[holderId]) {
        // Update running outstanding based on transaction type
        if (entry.transaction_type === 'given') {
          runningOutstandingByHolder[holderId] += parseFloat(entry.amount_collected || 0);
        } else if (entry.transaction_type === 'collected') {
          runningOutstandingByHolder[holderId] -= parseFloat(entry.amount_collected || 0);
        }
        // Update the month's ending outstanding for this holder
        creditHolderOutstandingMap[holderId].data[month] = Math.max(0, runningOutstandingByHolder[holderId]);
      }
    });

    // Forward-fill outstanding amounts for each credit holder
    const creditOutstanding = months.map(month => {
      const monthData = { month };
      Object.keys(creditHolderOutstandingMap).forEach(holderId => {
        const holder = creditHolderOutstandingMap[holderId];
        // Find the last known outstanding for this month or earlier
        let outstanding = holder.data[month];
        if (outstanding === 0) {
          // Forward fill from previous month
          const monthIndex = months.indexOf(month);
          for (let i = monthIndex - 1; i >= 0; i--) {
            if (holder.data[months[i]] !== 0) {
              outstanding = holder.data[months[i]];
              break;
            }
          }
        }
        monthData[holder.name] = Math.round(outstanding);
      });
      return monthData;
    });

    // 4. Calculate product sales per month
    const productSalesMap = {};

    products.forEach(product => {
      productSalesMap[product.id] = {
        name: product.product_name,
        data: {}
      };
      months.forEach(month => {
        productSalesMap[product.id].data[month] = 0;
      });
    });

    approvedSales.forEach(sale => {
      const month = formatMonth(sale.date);
      if (month && Array.isArray(sale.sale)) {
        sale.sale.forEach(item => {
          if (item.product_id && productSalesMap[item.product_id]) {
            const saleQty = parseFloat(item.sale || 0);
            productSalesMap[item.product_id].data[month] += saleQty;
          }
        });
      }
    });

    const productSales = months.map(month => {
      const monthData = { month };
      Object.keys(productSalesMap).forEach(productId => {
        const product = productSalesMap[productId];
        monthData[product.name] = Math.round(productSalesMap[productId].data[month] * 10) / 10; // Round to 1 decimal
      });
      return monthData;
    });

    // Return all analytics data
    console.log('Monthly sales data points:', monthlySales.length);
    console.log('Months range:', months.length > 0 ? `${months[0]} to ${months[months.length-1]}` : 'none');
    console.log('=== END ANALYTICS DEBUG ===');

    timer.finish();
    res.json({
      monthlySales,
      distributorOrders,
      creditOutstanding,
      productSales,
      distributorNames: distributors.map(d => d.name),
      productNames: products.map(p => p.product_name),
      creditHolderNames: creditHolders.map(ch => ch.name)
    });

  } catch (error) {
    timer.finish();
    console.error('Error fetching monthly analytics:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getProductMonthlyOrders = async (req, res) => {
  try {
    const { productId } = req.params;
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    // Get all orders and distributors for this organization
    const orders = await db.getOrdersByOrganisationId(organisationId);
    const distributors = await db.getDistributorsByOrganisationId(organisationId);

    // Get the product to verify it belongs to this organization
    const product = await db.getProductById(productId);
    if (!product || product.organisation_id !== organisationId) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Helper function to format date to YYYY-MM
    const formatMonth = (date) => {
      if (!date) return null;
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    };

    // Find the earliest order date
    let earliestDate = null;
    if (orders.length > 0) {
      earliestDate = new Date(Math.min(...orders.map(o => new Date(o.order_date))));
    }

    // If no orders, return empty array
    if (!earliestDate) {
      return res.json({
        productName: product.product_name,
        monthlyOrders: [],
        distributors: []
      });
    }

    // Generate list of months from earliest date to current month
    const currentDate = new Date();
    const months = [];
    let tempDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    while (tempDate <= currentDate) {
      months.push(formatMonth(tempDate));
      tempDate.setMonth(tempDate.getMonth() + 1);
    }

    // Calculate monthly ordered quantities per distributor for this specific product
    const monthlyOrdersMap = {};
    months.forEach(month => {
      monthlyOrdersMap[month] = {
        month,
        total: 0
      };
      // Initialize each distributor with 0 quantity
      distributors.forEach(dist => {
        monthlyOrdersMap[month][`dist_${dist.id}`] = 0;
      });
    });

    // Track which distributors actually have orders for this product
    const activeDistributorIds = new Set();

    orders.forEach(order => {
      const month = formatMonth(order.order_date);
      if (month && monthlyOrdersMap[month] && Array.isArray(order.order_data)) {
        order.order_data.forEach(item => {
          // Compare as strings since product_id is a UUID
          if (item.product_id === productId || item.product_id === parseInt(productId)) {
            const qty = parseFloat(item.qty || 0);
            if (qty > 0) {
              monthlyOrdersMap[month].total += qty;
              if (order.distributor_id) {
                monthlyOrdersMap[month][`dist_${order.distributor_id}`] += qty;
                activeDistributorIds.add(order.distributor_id);
              }
            }
          }
        });
      }
    });

    // Only include distributors that have ordered this product
    const activeDistributors = distributors
      .filter(dist => activeDistributorIds.has(dist.id))
      .map(dist => ({
        id: dist.id,
        name: dist.name,
        dataKey: `dist_${dist.id}`
      }));

    // Round all quantities to 1 decimal
    const monthlyOrders = months.map(month => {
      const data = { ...monthlyOrdersMap[month] };
      data.total = Math.round(data.total * 10) / 10;
      activeDistributors.forEach(dist => {
        data[dist.dataKey] = Math.round(data[dist.dataKey] * 10) / 10;
      });
      return data;
    });

    res.json({
      productName: product.product_name,
      monthlyOrders,
      distributors: activeDistributors
    });

  } catch (error) {
    console.error('Error fetching product monthly orders:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getMonthlyAnalytics, getProductMonthlyOrders };
