// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// middleware de log simples para cada requisição
app.use((req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`, {
    ip: req.ip,
  });
  next();
});

app.get('/', (req, res) => {
  res.send('Backend up and running – LT-CashFlow');
});

app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});
