const express = require('express');
const UserController = require('../controllers/userController'); // Import your user controller
const { authenticateToken, checkRole } = require('../middleware/authMiddleware'); // Import the JWT middleware
const router = express.Router();

console.log("Router initialized");

// Public routes (accessible without authentication)
router.post('/login', UserController.login); // Login
router.get('/signup/payPal-return', UserController.paypalReturn); // 
router.get('/signup/payPal-cancel', UserController.paypalCancel); 
router.post('/signup', UserController.signUp); // Sign Up

router.post('/reset-password/request-Email', UserController.emailSubmit); //reset password- first step
router.post('/reset-password/verify-pin', UserController.pinVerify); //reset password- second step
router.post('/reset-password/create-password', UserController.createPassword); //reset password- third step

 

router.get('/dashBoard/user-info', authenticateToken, UserController.getUserInfo); 
router.get('/dashBoard/setup-guide',authenticateToken, UserController.getSetupGuide );
router.put('/dashBoard/setup-guide/:stepId', authenticateToken, UserController.updateSetupGuide);



router.get('/', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Protected routes (require JWT token)
router.get('/profile', authenticateToken, (req, res) => {
  res.json({ message: `Hello ${req.user.username}, here is your profile.` });
});

// Admin-specific route (protected + role check)
router.get('/admin-dashboard', authenticateToken, checkRole('admin'), (req, res) => {
  res.json({ message: `Welcome admin ${req.user.username}, here is your dashboard.` });
});

module.exports = router;
