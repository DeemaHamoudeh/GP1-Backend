const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  confirmPassword: { type: String, required: true },
  role: { type: String, enum: ['storeOwner', 'storeEmployee', 'appStaff', 'customer'], required: true },
  phone: { type: String, default: null},
  country: { type: String, default: null },
  dob: { type: Date, default: null },
  image: { type: String, default: null },
  condition: { type: String, enum: ['colorBlind', 'blin', 'lowVision', 'eldery','none'], required: true },
  additionalDetails: {
    storeOwnerDetails: {
      storeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Store' }], // Array to support multiple stores
      subscriptionType: { type: String }, // Specific to the store owner
    },
    storeEmployeeDetails: {
      storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
      jobTitle: { type: String ,default: null},
      permissions: { type: [String], default: [] },
    },
    appStaffDetails: {
      workLocation: { type: String,default: null },
      department: { type: String,default: null },
    },
    customerDetails: {
      orderHistory: { type: [Object], default: [] },
      preferredPaymentMethod: { type: String ,default: null},
      location: {
        address: { type: String,default: null },
        city: { type: String ,default: null},
        state: { type: String,default: null },
        zipCode: { type: String,default: null },
      },
      wishlist: { type: [Object], default: [] },
    },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  username: { type: String },
});


// Create the User model

const User = mongoose.model('User', UserSchema, 'user');

module.exports = User;


