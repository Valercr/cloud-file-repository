/**
 * app.js
 * Express application entry point.
 * Configures middleware, mounts routes, and starts the HTTP server.
 */

require('dotenv').config();

const express = require('express');
const fileRoutes = require('./routes/fileRoutes');

const app = express();

app.use(express.json());

// Mount file routes
app.use('/files', fileRoutes);

// Global error handler — catches any unhandled errors from route handlers
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error('[ERROR]', err.message);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
