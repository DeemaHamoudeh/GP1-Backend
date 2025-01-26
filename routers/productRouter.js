const express = require('express');
const ProductController = require('../controllers/productController.js'); // Import your user controller
const { authenticateToken, checkRole } = require('../middleware/authMiddleware'); // Import the JWT middleware
const router = express.Router();

console.log("Router initialized");

// Public routes (accessible without authentication)
router.post('/addProduct',authenticateToken, ProductController.addProduct); 
router.get('/getAllProducts',authenticateToken, ProductController.getAllProducts); 
router.get('/getProduct/:id', authenticateToken, ProductController.getProductById);
router.get('/getStoreProducts/:storeId', authenticateToken, ProductController.getStoreProducts);
router.delete('/deleteProduct/:id', authenticateToken, ProductController.deleteProduct);
router.put('/updateProduct/:id', authenticateToken, ProductController.updateProduct);





router.get('/', (req, res) => {
  res.json({ message: 'API is working!' });
});



module.exports = router;