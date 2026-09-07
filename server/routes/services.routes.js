const express = require('express');
const router = express.Router();
const pool = require('../db');

const verifyToken = require('../middleware/verifyToken');
const requirePlatformStaff = require('../middleware/requirePlatformStaff');
const requirePlatformAdmin = require('../middleware/requirePlatformAdmin');

function parseRate(value) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 ? rate : null;
}

router.get('/', verifyToken, requirePlatformStaff, async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';

  if (includeInactive && req.user.platformRole !== 'ADMIN') {
    return res.status(403).json({ message: 'Platform admin only' });
  }

  try {
    const result = await pool.query(`
      SELECT id, name, hourly_rate, active, created_at, updated_at
      FROM services
      ${includeInactive ? '' : 'WHERE active = true'}
      ORDER BY active DESC, name ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', verifyToken, requirePlatformAdmin, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const hourlyRate = parseRate(req.body.hourly_rate);
  const active = req.body.active !== false;

  if (!name || hourlyRate === null) {
    return res.status(400).json({ message: 'Valid service name and hourly rate are required' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO services (name, hourly_rate, active)
      VALUES ($1, $2, $3)
      RETURNING id, name, hourly_rate, active, created_at, updated_at
    `, [name, hourlyRate, active]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A service with that name already exists' });
    }

    console.error('Error creating service:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', verifyToken, requirePlatformAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const name = String(req.body.name || '').trim();
  const hourlyRate = parseRate(req.body.hourly_rate);
  const active = req.body.active !== false;

  if (!Number.isInteger(id) || id <= 0 || !name || hourlyRate === null) {
    return res.status(400).json({ message: 'Valid service id, name and hourly rate are required' });
  }

  try {
    const result = await pool.query(`
      UPDATE services
      SET name = $1,
          hourly_rate = $2,
          active = $3,
          updated_at = now()
      WHERE id = $4
      RETURNING id, name, hourly_rate, active, created_at, updated_at
    `, [name, hourlyRate, active, id]);

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A service with that name already exists' });
    }

    console.error('Error updating service:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
