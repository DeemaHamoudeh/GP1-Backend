const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const sendgrid = require('@sendgrid/mail'); // Import SendGrid package
const secretKey = process.env.JWT_SECRET; // Use an environment variable for the secret key in production

if (!secretKey) {
  console.error('JWT_SECRET is not defined in the environment variables');
  process.exit(1); // Exit the process if JWT_SECRET is missing
}

// Setup SendGrid API key
sendgrid.setApiKey(process.env.SENDGRID_API_KEY); // Ensure you have a SENDGRID_API_KEY in your environment variables

// Login functionality
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username or email and password are required' });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password.trim(), user.password.trim());
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        condition: user.condition,
      },
      secretKey,
      { expiresIn: "1h" }
    );

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
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Sign Up functionality
const signUp = async (req, res) => {
  try {
    const { username, email, password, confirmPassword, role, plan, condition } = req.body;

    // Check for required fields
    if (!username || !email || !password || !confirmPassword || !role || !condition) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Password confirmation check
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

    // Create the user object
    const user = new User({
      username,
      email,
      password: hashedPassword,
      confirmPassword: hashedPassword,
      role,
      condition,
    });

    // Handle role-specific logic
    if (role === 'Store Owner') {
      if (!plan) {
        return res.status(400).json({ message: 'Plan is required for Store Owners' });
      }

      // Set the plan in the storeOwnerDetails
      user.additionalDetails.storeOwnerDetails.plan = plan;
    }

    // Save the user in the database
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        condition: user.condition,
      },
      secretKey,
      { expiresIn: "1h" }
    );

    // Return success response
    return res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error('Error during sign up:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Email Submission functionality (using SendGrid)
const emailSubmit = async (req, res) => {
  try {
    console.log("verify");
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const pin = crypto.randomInt(1000, 9999).toString();

    user.temporalPin.code = pin;
    user.temporalPin.expiresAt = Date.now() + 10 * 60 * 1000;
    await user.save();

    // SendGrid email content
    const msg = {
      to: email,
      from: 'demahamoudeh200@gmail.com', // Replace with your verified SendGrid email
      subject: 'Your Verification PIN',
      text: `Your verification PIN is ${pin}. It will expire in 10 minutes.`,
    };

    // Send the email using SendGrid
    await sendgrid.send(msg);

    return res.status(200).json({
      message: 'PIN sent successfully',
    });
  } catch (error) {
    console.error('Error during email submission:', error.message);
    return res.status(500).json({ message: 'Failed to send PIN' });
  }
};
const pinVerify = async (req, res) => {
  try {
    const { email, temporalPin } = req.body; // Receive email and temporalPin (with code) from the frontend
    const { code } = temporalPin;  // Extract the code from temporalPin

    // Validate input
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and PIN code are required' });
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the PIN code matches
    if (user.temporalPin.code !== code) {
      return res.status(400).json({ message: 'Invalid PIN code' });
    }

    // Check if the PIN has expired
    if (Date.now() > user.temporalPin.expiresAt) {
      return res.status(400).json({ message: 'PIN code has expired' });
    }

    // If PIN is valid and not expired
    return res.status(200).json({ message: 'PIN code verified successfully' });
  } catch (error) {
    console.error('Error during PIN verification:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
const createPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    // Validate inputs
    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Email, new password, and confirm password are required' });
    }

    // Check if new password and confirm password match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the PIN is valid and not expired by ensuring the temporalPin is still valid
    if (Date.now() > user.temporalPin.expiresAt) {
      return res.status(400).json({ message: 'PIN code has expired' });
    }
    const isOldPassword = await bcrypt.compare(newPassword, user.password);
    if (isOldPassword) {
      return res.status(400).json({ message: 'New password cannot be the same as the old password' });
    }


    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password and reset the temporalPin
    user.password = hashedPassword;
    user.confirmPassword = hashedPassword; // Optional, you can skip if you don't store confirmPassword
    user.temporalPin = { code: null, expiresAt: null }; // Clear the PIN data after successful password reset

    // Save the updated user object
    await user.save();

    return res.status(200).json({
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Error during password update:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { login, signUp, emailSubmit, pinVerify, createPassword};
