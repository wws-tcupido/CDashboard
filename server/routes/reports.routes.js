// routes/reports.routes.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { generateSeoReportPdf } = require('../services/pdf/puppeteer.services.js');

router.get('/pdf', verifyToken, async (req, res) => {
  try {
    const token = req.cookies.token;

    const pdf = await generateSeoReportPdf({
      token,
      baseUrl: process.env.APP_URL || 'http://localhost:4200'
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="SEO_Report.pdf"',
      'Content-Length': pdf.length
    });

    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;
