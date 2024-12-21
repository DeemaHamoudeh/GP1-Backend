const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the User Schema
const UserSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['storeOwner', 'storeEmployee', 'appStaff', 'customer'], required: true },
  phone: { type: String },
  country: { type: String },
  dob: { type: Date },
  conditions: {
    colorBlind: { type: Boolean, default: false },
    visualDisabilities: { type: Boolean, default: false },
    elderly: { type: Boolean, default: false },
    notSee: { type: Boolean, default: false },
    normal: { type: Boolean, default: false },
  },
  additionalDetails: {
    storeOwnerDetails: {
      storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
      subscriptionType: { type: String },
      storeDetails: {
        storeName: { type: String },
        storeCategory: { type: String },
        storeCountry: { type: String },
      },
    },
    storeEmployeeDetails: {
      storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
      jobTitle: { type: String },
      permissions: { type: [String], default: [] },
    },
    appStaffDetails: {
      workLocation: { type: String },
      department: { type: String },
    },
    customerDetails: {
      orderHistory: { type: [Object], default: [] },
      preferredPaymentMethod: { type: String },
      location: {
        address: { type: String },
        city: { type: String },
        state: { type: String },
        zipCode: { type: String },
      },
      wishlist: { type: [Object], default: [] },
    },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Add a pre-save hook for hashing the password
UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const bcrypt = require('bcryptjs');
    this.password = await bcrypt.hash(this.password, 10); // Hash the password with salt rounds = 10
  }
  next();
});

// Create the User model
const User = mongoose.model('User', UserSchema);

module.exports = User;
