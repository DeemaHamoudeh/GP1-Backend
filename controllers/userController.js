const User = require('../models/userModel'); // Ensure the path to your User model is correct
const bcrypt = require('bcrypt'); // To handle password hashing
const jwt = require('jsonwebtoken'); // Import JWT library
const secretKey = process.env.JWT_SECRET; // Use an environment variable for the secret key in production

if (!secretKey) {
  console.error('JWT_SECRET is not defined in the environment variables');
  process.exit(1); // Exit the process if JWT_SECRET is missing
}
// Login functionality
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // Accept a single identifier field for email/username

    // Validate input
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username or email and password are required' });
    }

    console.log('Received identifier:', identifier);

    // Find the user by email or username
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User found:', user.email);

    // Log password for debugging purposes (trim if needed)
    console.log('Received password:', password);
    console.log('User stored password hash:', user.password);

    // Verify the password
    const isPasswordValid = await bcrypt.compare(password.trim(), user.password.trim());
    console.log('Password comparison result:', isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Add token generation before the response
const token = jwt.sign(
  {
    id: user._id,
    role: user.role,
    condition: user.condition,
  },
  secretKey,
  { expiresIn: "1h" } // Set an appropriate expiration time
);

    // If everything is fine, respond with the user's details (excluding the password)
     // Respond with the token and user details
     return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        condition: user.condition,
      },
    });
  }  catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};


// Sign Up functionality
const signUp = async (req, res) => {
  console.log('Enter signUp');
  try {
    const {
      username,
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      role,
      plan,
      condition,
    } = req.body;

    // Validate basic fields
    if (!username || !email || !password || !confirmPassword || !role || !plan || !firstName || !lastName || !condition) {
      console.log(username);
      console.log(email);

      console.log(password);

      console.log(confirmPassword);

      console.log(role);
      console.log(condition);

      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Hashed password:', hashedPassword);

    // Create the user
    const user = new User({
      username,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      confirmPassword: hashedPassword,
      role,
      plan,
      condition,
    });

    await user.save();
    // Generate a JWT for the new user
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        condition: user.condition,
      },
      secretKey,
      { expiresIn: "1h" }
    );


    return res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error('Error during sign up:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { login, signUp };
