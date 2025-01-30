const User = require('../models/userModel');
const Store = require("../models/storeModel");
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const sendgrid = require('@sendgrid/mail'); // Import SendGrid package
const secretKey = process.env.JWT_SECRET; // Use an environment variable for the secret key in production
const paypal = require('../paypalConfig'); // Import PayPal client from your config file
const checkoutSdk = require('@paypal/checkout-server-sdk');
const client = require('../paypalConfig'); 
console.log('PayPal Client:', paypal); 
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
// Function to create PayPal payment
const createPayPalPayment = async (paypalEmail, plan) => {
  if (!paypal) {
    throw new Error('PayPal SDK is not initialized properly');
  }

  console.log('Initializing PayPal payment creation...');

  // Create a new order request
  const request = new checkoutSdk.orders.OrdersCreateRequest();
  request.prefer("return=representation"); // Ensure the response contains the created order details
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [
      {
        description: `Subscription Plan: ${plan}`,
        amount: {
          currency_code: 'USD',
          value: plan === 'Premium' ? '99.99' : '49.99',
        },
        payee: {
          email_address: 'sb-mmw3935275170@business.example.com', // Use sandbox business account email
        },
      },
    ],
    application_context: {
      return_url: process.env.PAYPAL_RETURN_URL, // Ensure this is set correctly
      cancel_url: process.env.PAYPAL_CANCEL_URL, // Ensure this is set correctly
    },
  });

  try {
    const order = await paypal.execute(request);

    // Log the response for debugging
    console.log('Order Response:', JSON.stringify(order.result, null, 2));

    const approvalUrl = order.result.links.find(link => link.rel === 'approve')?.href;
    if (!approvalUrl) {
      throw new Error('Approval URL is missing in PayPal response');
    }

    return {
      orderId: order.result.id,
      approvalUrl,
    };
  } catch (err) {
    console.error('Error creating PayPal payment:', err.message);
    throw new Error('Error creating PayPal payment: ' + err.message);
  }
};



// Function to capture PayPal payment after the user approves it
const capturePayPalPayment = async (orderId) => {
  console.log("Starting payment capture for orderId:", orderId);

  try {
    // Create a new OrdersCaptureRequest for the given orderId
    const request = new checkoutSdk.orders.OrdersCaptureRequest(orderId);
    request.requestBody({}); // Empty body for capture request

    // Execute the request using the PayPal client
    const capture = await client.execute(request);

    console.log("Capture response:", JSON.stringify(capture.result, null, 2)); // Log the response
    const captureStatus = capture.result.status;

    console.log("Capture status:", captureStatus);
    return captureStatus === 'COMPLETED';
  } catch (err) {
    console.error("Error capturing PayPal payment for orderId:", orderId, err.message, err.stack); // Detailed error
    throw new Error('Error capturing PayPal payment: ' + err.message);
  }
};


const signUp = async (req, res) => {
  try {
    const { username, email, password, confirmPassword, role, plan, condition, paymentMethod, paypalEmail, creditCardDetails } = req.body;

    if (!username || !email || !password || !confirmPassword || !role || !condition) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      confirmPassword: hashedPassword,
      role,
      condition,
      additionalDetails: {
        storeOwnerDetails: {
          plan,
          paymentMethod,
          paypalEmail,
          paymentStatus: "Pending", // Mark as pending initially
          storeIds: [] // Ensure storeIds array is initialized
        },
      },
    });

    let newStore = null; // To store store data if created

    // ✅ If user is Store Owner, create a Store automatically
    if (role === 'Store Owner') {
      console.log("🚀 Creating store for store owner...");

      newStore = new Store({
        ownerId: newUser._id, // Link store to user
        name: `${username}'s Store`, // Default store name
        email: email,
        phone: "",
        logo: "",
        description: "",
        address: { city: "", zipCode: "", country: "" },
        categories: [],
      });

      await newStore.save(); // Save store to database
      console.log("✅ Store saved:", newStore._id);

      // 🔹 Store the store ID in the user's additionalDetails
      newUser.additionalDetails.storeOwnerDetails.storeIds.push(newStore._id);
    }

    // ✅ Handle Payment for Premium Plan Users
    if (role === 'Store Owner' && plan === 'Premium') {
      if (paymentMethod === 'PayPal') {
        if (!paypalEmail) {
          return res.status(400).json({ message: 'PayPal email is required' });
        }

        // Step 1: Save the user first before initiating payment
        await newUser.save();

        // Step 2: Create PayPal payment
        const { orderId, approvalUrl } = await createPayPalPayment(paypalEmail, plan);
        console.log('Generated PayPal orderId:', orderId);

        // Step 3: Update the user's payment details
        const updatedUser = await User.findOneAndUpdate(
          { email: newUser.email },
          {
            $set: {
              "additionalDetails.storeOwnerDetails.paymentDetails.transactionId": orderId,
              "additionalDetails.storeOwnerDetails.paymentDetails.paymentStatus": "Pending",
            },
          },
          { new: true }
        );

        console.log('Updated user in DB:', updatedUser.additionalDetails.storeOwnerDetails.paymentDetails.transactionId);

        // Step 4: Return PayPal Approval URL
        return res.status(200).json({
          message: 'Payment initiated successfully',
          paypalOrderId: orderId,
          approvalUrl,
        });
      } else {
        return res.status(400).json({ message: 'Invalid payment method' });
      }
    }

    // ✅ Save user after assigning store ID
    await newUser.save();
    console.log("✅ User saved with Store ID:", newUser.additionalDetails.storeOwnerDetails.storeIds);

    // 🔹 Generate JWT Token
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role, condition: newUser.condition },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // ✅ Return user details + store details (if created)
    return res.status(201).json({
      message: 'User created successfully',
      user: newUser,
      store: newStore, // Store details included if they are a Store Owner
      token
    });

  } catch (error) {
    console.error('❌ Error during sign up:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};



// Function to handle PayPal return after payment
// Function to handle PayPal return after payment
const paypalReturn = async (req, res) => {
  console.log("PayPal return function started");

  const orderId = req.query.token?.trim(); // Ensure token exists and trim whitespace
  if (!orderId) {
    console.error("No orderId provided in the query parameters");
    return res.status(400).json({ message: "PayPal order ID is required" });
  }

  console.log("Received orderId:", orderId);

  try {
    // Step 1: Check the current status of the PayPal order
    const orderDetails = await getPayPalOrderDetails(orderId);

    if (orderDetails.status === "COMPLETED") {
      console.log(`Order ${orderId} has already been captured.`);
      return res.status(200).json({
        message: "Payment already captured",
      });
    }

    if (orderDetails.status !== "APPROVED") {
      console.error(`Order ${orderId} is not in a valid state for capture: ${orderDetails.status}`);
      return res.status(400).json({ message: `Order is not approved for capture` });
    }

    // Step 2: Capture the payment
    const isPaymentSuccessful = await capturePayPalPayment(orderId);

    if (!isPaymentSuccessful) {
      console.error("Payment capture failed for orderId:", orderId);
      return res.status(400).json({ message: "Payment verification failed" });
    }

    // Step 3: Find the user associated with this orderId
    const user = await User.findOne({
      "additionalDetails.storeOwnerDetails.paymentDetails.transactionId": orderId,
    });

    if (!user) {
      console.error("User not found for orderId:", orderId);
      return res.status(404).json({ message: "User not found" });
    }

    // Step 4: Update the user's payment status
    user.additionalDetails.storeOwnerDetails.paymentDetails.paymentStatus = "Completed";
    await user.save();

    console.log("Payment successfully captured for orderId:", orderId);

    // Step 5: Generate a new token for the user
    const token = jwt.sign(
      { id: user._id, role: user.role },
      secretKey,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Payment successful, account activated",
      token,
    });
  } catch (error) {
    console.error("Error during PayPal return:", error.message);
    return res.status(500).json({ message: "Error processing PayPal payment" });
  }
};





const paypalCancel = async (req, res) => {
  try {
    console.log("PayPal cancel"); // Debugging start

   
     
    
  } catch (error) {
    console.error("Error during PayPal return handling:", error.message, error.stack); // Print error details
  
  }
};

//here
// Helper function to simulate Credit Card payment verification (mocked for this example)
const verifyCreditCardPayment = async (creditCardDetails) => {
  // In a real-world scenario, you'd make an API call to a payment processor here.
  // For now, we are mocking a successful payment response
  return { success: true };
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

// دالة لجلب بيانات المستخدم
const getUserInfo = async (req, res) => {
  try {
    // استخرج التوكين من الهيدر
    const userId = req.user.id;

    // ابحث عن المستخدم في قاعدة البيانات
    const user = await User.findById(userId).select('-password'); // لا تعرض كلمة المرور

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
const getSetupGuide = async (req, res) => {
  try {
    // Extract user ID from the request (provided by authMiddleware)
    const userId = req.user.id;

    // Find the user in the database
    const user = await User.findById(userId).select(
      'role additionalDetails.storeOwnerDetails.setupGuide'
    );

    // If the user doesn't exist
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if the user is a Store Owner
    if (user.role !== 'Store Owner') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Store Owners can access the setup guide.',
      });
    }

    // Attach titles to the setup guide steps
    const titles = {
      1: 'Name your store',
      2: 'Add your products',
      3: 'Customize your online store',
      4: 'Shipment and delivery',
     
    };

    const setupGuide = user.additionalDetails.storeOwnerDetails.setupGuide.map(
      (step) => ({
        stepId: step.stepId,
        title: titles[step.stepId] || 'Untitled Step',
        isCompleted: step.isCompleted,
      })
    );

    return res.status(200).json({
      success: true,
      data: setupGuide,
    });
  } catch (error) {
    console.error('Error fetching setup guide:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
const updateSetupGuide = async (req, res) => {
  try {
    const userId = req.user.id; // Extract user ID from the middleware
    const { stepId } = req.params; // Extract stepId from the request parameters
    const { isCompleted } = req.body; // Extract isCompleted from the request body

    if (typeof isCompleted !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isCompleted must be a boolean value.',
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Ensure the user is a store owner
    if (user.role !== 'Store Owner') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Store Owners can update the setup guide.',
      });
    }

    // Find the step in the setup guide
    const setupGuide = user.additionalDetails.storeOwnerDetails.setupGuide;
    const stepToUpdate = setupGuide.find((step) => step.stepId === parseInt(stepId));

    if (!stepToUpdate) {
      return res.status(404).json({
        success: false,
        message: `Step with ID ${stepId} not found in the setup guide.`,
      });
    }

    // Update the step's status
    stepToUpdate.isCompleted = isCompleted;

    // Save the user document
    await user.save();

    // Attach titles to the setup guide steps
    const titles = {
      1: 'Name your store',
      2: 'Add your products',
      3: 'Customize your online store',
      4: 'Shipment and delivery',
     
    };

    const updatedGuide = setupGuide.map((step) => ({
      stepId: step.stepId,
      title: titles[step.stepId] || 'Untitled Step',
      isCompleted: step.isCompleted,
    }));

    return res.status(200).json({
      success: true,
      message: `Step ${stepId} updated successfully.`,
      data: updatedGuide,
    });
  } catch (error) {
    console.error('Error updating setup guide:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



module.exports = { login, signUp, emailSubmit, pinVerify, createPassword,paypalReturn,paypalCancel,getUserInfo,getSetupGuide,updateSetupGuide};
