const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const config = require('./config/config');
const logger = require('./config/logger');
const globalErrorHandler = require('./middleware/errorHandler');
const routes = require('./routes/v1');

const app = express();

app.use(cors());

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/api', routes);

app.use(globalErrorHandler);

module.exports = app;