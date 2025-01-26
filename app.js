const express = require('express');
const userRoutes = require('./routers/userRouter');
const storeRoutes = require('./routers/storeRouter'); 
const productRoutes = require('./routers/productRouter'); 
const app = express();

// Middleware
app.use(express.json()); // Parse incoming JSON requests
console.log('beforee');
// Routes
app.use('/storeMaster/users', userRoutes); 
app.use('/storeMaster/store', storeRoutes); 
app.use('/storeMaster/product', productRoutes); 
console.log('after');
module.exports = app; 

