// Optional backend: sends every SmartHire application email automatically.
// Setup:  npm i express nodemailer cors
// Env:    GMAIL_USER=you@gmail.com  GMAIL_APP_PASSWORD=<Gmail app password>  ALLOWED_ORIGIN=https://your-site
// Then set  const EMAIL_API='https://your-server/api/application-email'  in the SmartHire page.
const express = require('express'), nodemailer = require('nodemailer'), cors = require('cors');
const app = express();
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
app.use(express.json({ limit: '50kb' }));
const tx = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });
const TO = ['sreevarun643@gmail.com', 'mdhammad2906@gmail.com'];   // recipients are fixed on the server
app.post('/api/application-email', async (req, res) => {
  try {
    const { subject, text } = req.body || {};
    if (!subject || !text) return res.status(400).json({ error: 'missing fields' });
    await tx.sendMail({ from: process.env.GMAIL_USER, to: TO, subject: String(subject).slice(0, 200), text: String(text).slice(0, 5000) });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'send failed' }); }
});
app.listen(process.env.PORT || 3000);
