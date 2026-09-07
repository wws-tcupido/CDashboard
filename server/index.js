require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:4200",
  credentials: true
}));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/admin/users', require('./routes/users.routes'));
app.use('/api/companies', require('./routes/companies.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/stats', require('./routes/gsc.routes'));
app.use('/api/stats', require('./routes/ga4.routes'));
app.use('/api/campaigns', require('./routes/campaign.routes'));
app.use('/api/services', require('./routes/services.routes'));
app.use('/api/time', require('./routes/time.routes'));
app.use('/uploads', express.static('uploads'));
app.get('/api/health', (_, res) => res.json({ ok: true }));

app.listen(process.env.PORT || 5000, () =>
  console.log(`API on http://localhost:${process.env.PORT || 5000}`)
);
