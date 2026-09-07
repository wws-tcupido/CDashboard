const express = require('express');
const router = express.Router();
const pool = require('../db');

const verifyToken = require('../middleware/verifyToken');
const requirePlatformStaff = require('../middleware/requirePlatformStaff');

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function parseHours(value) {
  const hours = Number(value);
  return Number.isFinite(hours) && hours > 0 ? hours : null;
}

async function getActiveService(serviceId) {
  const result = await pool.query(`
    SELECT id, hourly_rate
    FROM services
    WHERE id = $1 AND active = true
  `, [serviceId]);

  return result.rows[0] || null;
}

router.get('/', verifyToken, requirePlatformStaff, async (req, res) => {
  const scope = req.query.scope === 'team' ? 'team' : 'mine';

  if (scope === 'team' && req.user.platformRole !== 'ADMIN') {
    return res.status(403).json({ message: 'Platform admin only' });
  }

  try {
    const params = [];
    let where = '';

    if (scope === 'mine') {
      params.push(req.user.userId);
      where = 'WHERE te.user_id = $1';
    }

    const result = await pool.query(`
      SELECT
        te.id,
        te.user_id,
        te.service_id,
        s.name AS service_name,
        te.work_date,
        te.hours,
        te.description,
        te.hourly_rate,
        te.created_at,
        te.updated_at,
        trim(concat_ws(' ', u.first_name, u.last_name)) AS user_name
      FROM time_entries te
      JOIN services s ON s.id = te.service_id
      JOIN users u ON u.id = te.user_id
      ${where}
      ORDER BY te.work_date DESC, te.id DESC
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching time entries:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', verifyToken, requirePlatformStaff, async (req, res) => {
  const serviceId = Number(req.body.service_id);
  const workDate = String(req.body.work_date || '');
  const hours = parseHours(req.body.hours);
  const description = String(req.body.description || '').trim();

  if (!Number.isInteger(serviceId) || serviceId <= 0 || !validDate(workDate) || hours === null || !description) {
    return res.status(400).json({ message: 'Valid service, date, hours and description are required' });
  }

  try {
    const service = await getActiveService(serviceId);
    if (!service) {
      return res.status(400).json({ message: 'Selected service is not active or does not exist' });
    }

    const result = await pool.query(`
      INSERT INTO time_entries
        (user_id, service_id, work_date, hours, description, hourly_rate)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, service_id, work_date, hours, description, hourly_rate, created_at, updated_at
    `, [req.user.userId, serviceId, workDate, hours, description, service.hourly_rate]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating time entry:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', verifyToken, requirePlatformStaff, async (req, res) => {
  const id = Number(req.params.id);
  const serviceId = Number(req.body.service_id);
  const workDate = String(req.body.work_date || '');
  const hours = parseHours(req.body.hours);
  const description = String(req.body.description || '').trim();

  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(serviceId) || serviceId <= 0 || !validDate(workDate) || hours === null || !description) {
    return res.status(400).json({ message: 'Valid entry id, service, date, hours and description are required' });
  }

  try {
    const existingResult = await pool.query(`
      SELECT id, user_id, service_id, hourly_rate
      FROM time_entries
      WHERE id = $1
    `, [id]);

    if (!existingResult.rows.length) {
      return res.status(404).json({ message: 'Time entry not found' });
    }

    const existing = existingResult.rows[0];
    if (existing.user_id !== req.user.userId) {
      return res.status(403).json({ message: 'You can only edit your own time entries' });
    }

    let hourlyRate = existing.hourly_rate;
    if (existing.service_id !== serviceId) {
      const service = await getActiveService(serviceId);
      if (!service) {
        return res.status(400).json({ message: 'Selected service is not active or does not exist' });
      }
      hourlyRate = service.hourly_rate;
    }

    const result = await pool.query(`
      UPDATE time_entries
      SET service_id = $1,
          work_date = $2,
          hours = $3,
          description = $4,
          hourly_rate = $5,
          updated_at = now()
      WHERE id = $6 AND user_id = $7
      RETURNING id, user_id, service_id, work_date, hours, description, hourly_rate, created_at, updated_at
    `, [serviceId, workDate, hours, description, hourlyRate, id, req.user.userId]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating time entry:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', verifyToken, requirePlatformStaff, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'Valid time entry id is required' });
  }

  try {
    const result = await pool.query(`
      DELETE FROM time_entries
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [id, req.user.userId]);

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Time entry not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting time entry:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
