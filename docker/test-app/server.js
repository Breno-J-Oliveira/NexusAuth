const express = require('express');

const app = express();
const PORT = process.env.PORT || 4000;
const API_URL = process.env.API_URL || 'http://localhost:3000';

app.use(express.json());

let receivedWebhooks = [];

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'nexusauth-test-app',
    apiUrl: API_URL,
    timestamp: new Date().toISOString(),
  });
});

app.post('/webhook', (req, res) => {
  const entry = {
    headers: {
      'x-webhook-signature': req.headers['x-webhook-signature'],
      'x-webhook-event': req.headers['x-webhook-event'],
      'content-type': req.headers['content-type'],
    },
    body: req.body,
    receivedAt: new Date().toISOString(),
  };
  receivedWebhooks.push(entry);
  console.log('[Webhook Received]', JSON.stringify(entry));
  res.status(200).json({ ok: true });
});

app.get('/webhook-received', (_req, res) => {
  res.json({ count: receivedWebhooks.length, webhooks: receivedWebhooks });
});

app.delete('/webhook-received', (_req, res) => {
  receivedWebhooks = [];
  res.json({ message: 'Cleared' });
});

app.listen(PORT, () => {
  console.log(`Test app running on port ${PORT}`);
});
