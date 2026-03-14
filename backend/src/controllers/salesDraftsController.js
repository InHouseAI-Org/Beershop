const pool = require('../config/database');

/**
 * Save or update a sales draft
 */
const saveSalesDraft = async (req, res) => {
  const client = await pool.connect();
  try {
    const organisationId = req.user.organisationId;
    const userId = req.user.id;
    const draftData = req.body;

    console.log('=== SAVE SALES DRAFT ===');
    console.log('Organisation ID:', organisationId);
    console.log('User ID:', userId);
    console.log('Draft Data:', draftData);

    if (!organisationId || !userId) {
      return res.status(400).json({ error: 'Organisation ID and User ID required' });
    }

    // Upsert the draft (insert or update if exists)
    const query = `
      INSERT INTO sales_drafts (organisation_id, user_id, draft_data, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (organisation_id, user_id)
      DO UPDATE SET
        draft_data = EXCLUDED.draft_data,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [organisationId, userId, JSON.stringify(draftData)];
    const result = await client.query(query, values);

    console.log('Draft saved successfully:', result.rows[0].id);

    res.status(200).json({
      message: 'Draft saved successfully',
      draft: result.rows[0]
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  } finally {
    client.release();
  }
};

/**
 * Get the sales draft for the current user
 */
const getSalesDraft = async (req, res) => {
  const client = await pool.connect();
  try {
    const organisationId = req.user.organisationId;
    const userId = req.user.id;

    console.log('=== GET SALES DRAFT ===');
    console.log('Organisation ID:', organisationId);
    console.log('User ID:', userId);

    if (!organisationId || !userId) {
      return res.status(400).json({ error: 'Organisation ID and User ID required' });
    }

    const query = `
      SELECT * FROM sales_drafts
      WHERE organisation_id = $1 AND user_id = $2
    `;

    const result = await client.query(query, [organisationId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No draft found' });
    }

    console.log('Draft found:', result.rows[0].id);

    res.status(200).json({
      draft: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching draft:', error);
    res.status(500).json({ error: 'Failed to fetch draft' });
  } finally {
    client.release();
  }
};

/**
 * Delete the sales draft for the current user
 */
const deleteSalesDraft = async (req, res) => {
  const client = await pool.connect();
  try {
    const organisationId = req.user.organisationId;
    const userId = req.user.id;

    console.log('=== DELETE SALES DRAFT ===');
    console.log('Organisation ID:', organisationId);
    console.log('User ID:', userId);

    if (!organisationId || !userId) {
      return res.status(400).json({ error: 'Organisation ID and User ID required' });
    }

    const query = `
      DELETE FROM sales_drafts
      WHERE organisation_id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await client.query(query, [organisationId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No draft found to delete' });
    }

    console.log('Draft deleted:', result.rows[0].id);

    res.status(200).json({
      message: 'Draft deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting draft:', error);
    res.status(500).json({ error: 'Failed to delete draft' });
  } finally {
    client.release();
  }
};

module.exports = {
  saveSalesDraft,
  getSalesDraft,
  deleteSalesDraft
};
