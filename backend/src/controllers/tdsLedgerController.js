const pool = require('../config/database');

const getTDSLedger = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;
    const { start_date, end_date } = req.query;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    // Build query with optional date filtering
    let ledgerQuery = `
      SELECT * FROM tds_ledger_detailed
      WHERE organisation_id = $1
    `;
    const queryParams = [organisationId];
    let paramCount = 2;

    if (start_date) {
      ledgerQuery += ` AND order_date >= $${paramCount}`;
      queryParams.push(start_date);
      paramCount++;
    }

    if (end_date) {
      ledgerQuery += ` AND order_date <= $${paramCount}`;
      queryParams.push(end_date);
      paramCount++;
    }

    ledgerQuery += ` ORDER BY order_date DESC, created_at DESC`;

    const ledgerResult = await pool.query(ledgerQuery, queryParams);

    // Fetch summary data with same date filtering
    let summaryQuery = `
      SELECT
        payment_status,
        SUM(tds_amount) as total_amount,
        COUNT(*) as count
      FROM tds_ledger
      WHERE organisation_id = $1
    `;
    const summaryParams = [organisationId];
    let summaryParamCount = 2;

    if (start_date) {
      summaryQuery += ` AND order_date >= $${summaryParamCount}`;
      summaryParams.push(start_date);
      summaryParamCount++;
    }

    if (end_date) {
      summaryQuery += ` AND order_date <= $${summaryParamCount}`;
      summaryParams.push(end_date);
      summaryParamCount++;
    }

    summaryQuery += ` GROUP BY payment_status`;

    const summaryResult = await pool.query(summaryQuery, summaryParams);

    // Format summary
    const summary = {
      pending: 0,
      pending_count: 0,
      received: 0,
      received_count: 0,
      adjusted: 0,
      adjusted_count: 0,
      total: 0,
      total_count: 0
    };

    summaryResult.rows.forEach(row => {
      const status = row.payment_status;
      const amount = parseFloat(row.total_amount || 0);
      const count = parseInt(row.count || 0);

      if (status === 'pending') {
        summary.pending = amount;
        summary.pending_count = count;
      } else if (status === 'received') {
        summary.received = amount;
        summary.received_count = count;
      } else if (status === 'adjusted') {
        summary.adjusted = amount;
        summary.adjusted_count = count;
      }

      summary.total += amount;
      summary.total_count += count;
    });

    res.json({
      ledger: ledgerResult.rows,
      summary
    });
  } catch (error) {
    console.error('Error fetching TDS ledger:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getTDSLedger };
