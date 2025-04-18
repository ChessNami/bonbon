const express = require('express');
const cors = require('cors');
const emailRoutes = require('./routes/email');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/email', emailRoutes);

// Start server for local
const PORT = process.env.API_PORT || 5000;
app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
});

// Export for Vercel
// module.exports = app;