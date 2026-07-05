const express = require('express');

const app = express();
const PORT = process.env.PORT || 4000;
const API_URL = process.env.API_URL || 'http://localhost:3000';

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'nexusauth-test-app',
    apiUrl: API_URL,
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Test app running on port ${PORT}`);
});
