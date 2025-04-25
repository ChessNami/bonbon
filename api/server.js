const express = require('express');
const cors = require('cors');
const emailRoutes = require('./routes/email');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: 'https://barangay-bonbon.vercel.app', // Allow only your React app's domain
    methods: ['GET', 'POST', 'OPTIONS'], // Specify allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Specify allowed headers
}));
app.use(express.json());

// Routes
app.use('/api/email', emailRoutes);

// Start server for local
// const PORT = process.env.API_PORT || 5000;
// app.listen(PORT, () => {
//     console.log(`Express server running on port ${PORT}`);
// });

// Export for Vercel
module.exports = app;