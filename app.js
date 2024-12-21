const express = require('express');
const userRoutes = require('./routers/userRouter'); // Import your user routes

const app = express();

// Middleware
app.use(express.json()); // Parse incoming JSON requests

// Routes
app.use('/api/users', userRoutes); // Prefix for all user-related routes

module.exports = app; // Export the app to use it in server.js
