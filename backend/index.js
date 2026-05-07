const express = require('express');
require('./connection');
const userRoute = require('./routes/index');
const { applySecurity } = require('./security');

const app = express();

applySecurity(app);
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));
app.use('/user', userRoute);

module.exports = app;
