const pool = require('../config/database');
const db = require('../models/data');

/**
 * Get all schemes for organization
 */
const getAllSchemes = async (req, res) => {
  const client = await pool.connect();
  try {
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    const query = `
      SELECT * FROM scheme_tracking
      WHERE organisation_id = $1
      ORDER BY created_at DESC
    `;

    const result = await client.query(query, [organisationId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching schemes:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Get single scheme with progress tracking
 */
const getScheme = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const organisationId = req.user.organisationId;

    // Get scheme details from view
    const schemeQuery = `
      SELECT * FROM scheme_tracking
      WHERE id = $1 AND organisation_id = $2
    `;
    const schemeResult = await client.query(schemeQuery, [id, organisationId]);

    if (schemeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scheme not found' });
    }

    const scheme = schemeResult.rows[0];

    // Calculate progress by querying orders
    const progress = await calculateSchemeProgress(client, scheme);

    res.json({
      ...scheme,
      progress
    });
  } catch (error) {
    console.error('Error fetching scheme:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Create new scheme
 */
const createScheme = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      distributorId,
      schemeName,
      schemeStartDate,
      schemePeriodValue,
      schemePeriodUnit,
      schemeTargetQty,
      targetType,
      schemeProducts, // Array of {product_id, product_name, target_qty (if per_product)}
      schemeValue,
      notes
    } = req.body;

    const organisationId = req.user.organisationId;
    const createdBy = req.user.id;

    // Validate required fields
    if (!distributorId || !schemeName || !schemeStartDate || !schemePeriodValue ||
        !schemePeriodUnit || !schemeTargetQty || !targetType || !schemeProducts ||
        !schemeValue) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Validate period unit
    if (!['weeks', 'months', 'years'].includes(schemePeriodUnit)) {
      return res.status(400).json({ error: 'Invalid scheme period unit' });
    }

    // Validate target type
    if (!['overall', 'per_product'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }

    // Verify distributor belongs to organization
    const distributor = await db.getDistributorById(distributorId);
    if (!distributor || distributor.organisation_id !== organisationId) {
      return res.status(404).json({ error: 'Distributor not found' });
    }

    const insertQuery = `
      INSERT INTO schemes (
        organisation_id, distributor_id, scheme_name, scheme_start_date,
        scheme_period_value, scheme_period_unit, scheme_target_qty,
        target_type, scheme_products, scheme_value, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      organisationId,
      distributorId,
      schemeName,
      schemeStartDate,
      schemePeriodValue,
      schemePeriodUnit,
      schemeTargetQty,
      targetType,
      JSON.stringify(schemeProducts),
      schemeValue,
      notes || null,
      createdBy
    ];

    const result = await client.query(insertQuery, values);

    await client.query('COMMIT');

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating scheme:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Update scheme
 */
const updateScheme = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const organisationId = req.user.organisationId;

    const {
      distributorId,
      schemeName,
      schemeStartDate,
      schemePeriodValue,
      schemePeriodUnit,
      schemeTargetQty,
      targetType,
      schemeProducts,
      schemeValue,
      notes
    } = req.body;

    // Verify scheme belongs to organization
    const checkQuery = `SELECT * FROM schemes WHERE id = $1 AND organisation_id = $2`;
    const checkResult = await client.query(checkQuery, [id, organisationId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scheme not found' });
    }

    const updateQuery = `
      UPDATE schemes
      SET
        distributor_id = COALESCE($1, distributor_id),
        scheme_name = COALESCE($2, scheme_name),
        scheme_start_date = COALESCE($3, scheme_start_date),
        scheme_period_value = COALESCE($4, scheme_period_value),
        scheme_period_unit = COALESCE($5, scheme_period_unit),
        scheme_target_qty = COALESCE($6, scheme_target_qty),
        target_type = COALESCE($7, target_type),
        scheme_products = COALESCE($8, scheme_products),
        scheme_value = COALESCE($9, scheme_value),
        notes = COALESCE($10, notes)
      WHERE id = $11 AND organisation_id = $12
      RETURNING *
    `;

    const values = [
      distributorId,
      schemeName,
      schemeStartDate,
      schemePeriodValue,
      schemePeriodUnit,
      schemeTargetQty,
      targetType,
      schemeProducts ? JSON.stringify(schemeProducts) : null,
      schemeValue,
      notes,
      id,
      organisationId
    ];

    const result = await client.query(updateQuery, values);

    await client.query('COMMIT');

    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating scheme:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Close scheme manually
 */
const closeScheme = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const organisationId = req.user.organisationId;

    // Get current scheme
    const schemeQuery = `SELECT * FROM schemes WHERE id = $1 AND organisation_id = $2`;
    const schemeResult = await client.query(schemeQuery, [id, organisationId]);

    if (schemeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scheme not found' });
    }

    const updateQuery = `
      UPDATE schemes
      SET status = 'closed'
      WHERE id = $1 AND organisation_id = $2
      RETURNING *
    `;

    const result = await client.query(updateQuery, [id, organisationId]);

    res.json({
      message: 'Scheme closed successfully',
      scheme: result.rows[0]
    });
  } catch (error) {
    console.error('Error closing scheme:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Get scheme progress
 */
const getSchemeProgress = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const organisationId = req.user.organisationId;

    // Get scheme details
    const schemeQuery = `SELECT * FROM scheme_tracking WHERE id = $1 AND organisation_id = $2`;
    const schemeResult = await client.query(schemeQuery, [id, organisationId]);

    if (schemeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scheme not found' });
    }

    const scheme = schemeResult.rows[0];
    const progress = await calculateSchemeProgress(client, scheme);

    // Check if target is achieved and update scheme status
    if (progress.achieved && !scheme.achieved && scheme.status === 'active') {
      await client.query(
        `UPDATE schemes SET status = 'completed', achieved = true, achieved_date = CURRENT_DATE WHERE id = $1`,
        [id]
      );
      // Refresh scheme data after update
      const updatedResult = await client.query(schemeQuery, [id, organisationId]);
      scheme.status = 'completed';
      scheme.achieved = true;
      scheme.achieved_date = new Date();
    }

    // Return all scheme details plus progress
    res.json({
      ...scheme,
      ...progress
    });
  } catch (error) {
    console.error('Error fetching scheme progress:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Get scheme statistics for dashboard
 */
const getSchemeStats = async (req, res) => {
  const client = await pool.connect();
  try {
    const organisationId = req.user.organisationId;

    const statsQuery = `
      SELECT
        COUNT(*) as total_schemes,
        COUNT(*) FILTER (WHERE status = 'active') as active_schemes,
        COUNT(*) FILTER (WHERE status = 'completed' AND achieved = true) as achieved_schemes,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_schemes,
        COALESCE(SUM(scheme_value) FILTER (WHERE status = 'active'), 0) as total_value_to_avail,
        COALESCE(SUM(scheme_value) FILTER (WHERE status = 'completed' AND achieved = true), 0) as total_value_achieved
      FROM schemes
      WHERE organisation_id = $1
    `;

    const result = await client.query(statsQuery, [organisationId]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching scheme stats:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Helper function to calculate scheme progress
 */
async function calculateSchemeProgress(client, scheme) {
  try {
    const productIds = scheme.scheme_products.map(p => p.product_id);

    // Get all orders from distributor within scheme period that contain scheme products
    const ordersQuery = `
      SELECT
        o.id,
        o.order_date,
        o.order_data
      FROM orders o
      WHERE o.distributor_id = $1
        AND o.organisation_id = $2
        AND o.order_date >= $3
        AND o.order_date <= $4
    `;

    const ordersResult = await client.query(ordersQuery, [
      scheme.distributor_id,
      scheme.organisation_id,
      scheme.scheme_start_date,
      scheme.scheme_end_date
    ]);

    let totalQty = 0;
    const productProgress = {};

    // Initialize product progress tracking
    scheme.scheme_products.forEach(product => {
      productProgress[product.product_id] = {
        product_id: product.product_id,
        product_name: product.product_name,
        target_qty: scheme.target_type === 'per_product' ? parseFloat(product.target_qty || 0) : 0,
        current_qty: 0,
        achieved: false
      };
    });

    // Calculate quantities from orders
    ordersResult.rows.forEach(order => {
      if (order.order_data && Array.isArray(order.order_data)) {
        order.order_data.forEach(item => {
          if (productIds.includes(item.product_id)) {
            const qty = parseFloat(item.qty || 0);
            totalQty += qty;

            if (productProgress[item.product_id]) {
              productProgress[item.product_id].current_qty += qty;
            }
          }
        });
      }
    });

    // Calculate achievement status
    let achieved = false;
    if (scheme.target_type === 'overall') {
      achieved = totalQty >= parseFloat(scheme.scheme_target_qty);
    } else {
      // For per_product, all products must meet their individual targets
      achieved = Object.values(productProgress).every(p => p.current_qty >= parseFloat(p.target_qty || 0));

      // Mark individual product achievements
      Object.values(productProgress).forEach(p => {
        p.achieved = p.current_qty >= parseFloat(p.target_qty || 0);
      });
    }

    const progressPercentage = scheme.target_type === 'overall'
      ? Math.min((totalQty / parseFloat(scheme.scheme_target_qty)) * 100, 100)
      : (Object.values(productProgress).filter(p => p.achieved).length / scheme.scheme_products.length) * 100;

    return {
      total_qty: totalQty,
      target_qty: parseFloat(scheme.scheme_target_qty),
      progress_percentage: progressPercentage.toFixed(2),
      achieved,
      product_progress: Object.values(productProgress),
      orders_count: ordersResult.rows.length
    };
  } catch (error) {
    console.error('Error calculating scheme progress:', error);
    return {
      total_qty: 0,
      target_qty: parseFloat(scheme.scheme_target_qty),
      progress_percentage: 0,
      achieved: false,
      product_progress: [],
      orders_count: 0
    };
  }
}

module.exports = {
  getAllSchemes,
  getScheme,
  createScheme,
  updateScheme,
  closeScheme,
  getSchemeProgress,
  getSchemeStats
};
