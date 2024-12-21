// const express = require('express');
// const router = express.Router();
// const UserController = require('../controllers/userController');  // This would be your controller

// // Define the POST route for login
// router.post('/login', UserController.login);  // Calls the login method in the UserController

// module.exports = router;
const express = require('express');
const router = express.Router();

// Dummy route to test
router.get('/', (req, res) => {
  res.json({ message: 'API is working!' });
});

module.exports = router;
