const pool = require('../config/database');

const getTCSLedger = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    // Fetch TCS ledger data from the view
    const ledgerQuery = `
      SELECT * FROM tcs_ledger_detailed
      WHERE organisation_id = $1
      ORDER BY order_date DESC, created_at DESC
    `;
    const ledgerResult = await pool.query(ledgerQuery, [organisationId]);

    // Fetch summary data
    const summaryQuery = `
      SELECT
        payment_status,
        SUM(tcs_amount) as total_amount,
        COUNT(*) as count
      FROM tcs_ledger
      WHERE organisation_id = $1
      GROUP BY payment_status
    `;
    const summaryResult = await pool.query(summaryQuery, [organisationId]);

    // Format summary
    const summary = {
      pending: 0,
      pending_count: 0,
      paid: 0,
      paid_count: 0,
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
      } else if (status === 'paid') {
        summary.paid = amount;
        summary.paid_count = count;
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
    console.error('Error fetching TCS ledger:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getTCSLedger };
