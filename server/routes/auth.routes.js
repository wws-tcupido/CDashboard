// server/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');
const cookieSecure = process.env.COOKIE_SECURE === 'true';

/**
 * POST /auth/login
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Fetch user (GLOBAL identity)
    const userResult = await pool.query(
      `
      SELECT
        id,
        email,
        password_hash,
        is_active,
        platform_role
      FROM users
      WHERE email = $1
      `,
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account disabled' });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 2. Fetch company memberships (SCOPED identity)
    const membershipsResult = await pool.query(
      `
      SELECT company_id, role
      FROM company_users
      WHERE user_id = $1
      ORDER BY created_at ASC
      `,
      [user.id]
    );

    // 3. Platform admin does NOT require company membership
    if (membershipsResult.rows.length === 0 && !user.platform_role) {
      return res.status(403).json({ message: 'No company assigned' });
    }

    // Pick a default company context (first one for now)
    const primaryCompany = membershipsResult.rows[0] || null;

    // 4. Build JWT from AUTHORITATIVE data
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      companyId: primaryCompany?.company_id ?? null,
      role: primaryCompany?.role ?? null,           // company role only
      platformRole: user.platform_role ?? null // platform role (ADMIN/DESIGNER) only
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // 5. Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: cookieSecure,
      maxAge: 15 * 60 * 1000
    });

    // 6. Respond to frontend
    res.json({
      id: user.id,
      email: user.email,
      companyId: tokenPayload.companyId,
      role: tokenPayload.role,
      platformRole: tokenPayload.platformRole
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /auth/me
 */
router.get('/me', verifyToken, (req, res) => {
  res.json(req.user);
});

/**
 * POST /auth/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    sameSite: 'lax',
    secure: cookieSecure
  });
  res.json({ message: 'logged out' });
});

module.exports = router;
