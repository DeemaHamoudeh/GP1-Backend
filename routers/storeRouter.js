const express = require('express');
const StoreController = require('../controllers/storeController'); // Import your user controller
const { authenticateToken, checkRole } = require('../middleware/authMiddleware'); // Import the JWT middleware
const router = express.Router();

console.log("Router initialized");

// Public routes (accessible without authentication)
router.put('/updateStoreDetails/:id',authenticateToken, StoreController.updateStoreDetails); // 
router.get('/getStoreDetails/:id', authenticateToken, StoreController.getStoreDetails); // 




router.get('/', (req, res) => {
  res.json({ message: 'API is working!' });
});



module.exports = router;
