const User = require('../models/userModel');  // Assuming you're using a User model for MongoDB

// Login controller function
const login = (req, res) => {
  const { email, password } = req.body;
  // Find user in the database and check credentials (simplified)
  User.findOne({ email })
    .then(user => {
      if (!user) {
        return res.status(404).send('User not found');
      }
      // You would normally compare passwords here (e.g., using bcrypt)
      if (user.password === password) {
        res.status(200).send('Login successful');
      } else {
        res.status(400).send('Incorrect password');
      }
    })
    .catch(err => res.status(500).send('Server error'));
};

module.exports = { login };
