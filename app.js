const express = require('express');
const userRoutes = require('./routers/userRouter'); // Import your user routes
const storeRoutes = require('./routers/storeRouter'); // Import your user routes
const app = express();

// Middleware
app.use(express.json()); // Parse incoming JSON requests
console.log('beforee');
// Routes
app.use('/storeMaster/users', userRoutes); // Prefix for all user-related routes
app.use('/storeMaster/store', storeRoutes); // Prefix for all user-related routes
console.log('after');
module.exports = app; // Export the app to use it in server.js

