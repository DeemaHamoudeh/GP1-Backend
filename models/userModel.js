const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  firstName: { type: String, default: null },
  lastName: { type: String, default: null },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  confirmPassword: { type: String, required: true },
  role: {
    type: String,
    enum: ['Store Owner', 'storeEmployee', 'appStaff', 'customer'],
    required: true,
  },
  phone: { type: String, default: null },
  country: { type: String, default: null },
  dob: { type: Date, default: null },
  image: { type: String, default: null },
  condition: {
    type: String,
    enum: ['Colorblind', 'Blind', 'Low Vision', 'Elderly', 'None'],
    required: true,
  },
  additionalDetails: {
    storeOwnerDetails: {
      storeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Store' }],
      plan: { type: String, enum: ['Basic', 'Premium'], default: null },
      paymentDetails: {
        paymentStatus: {
          type: String,
          enum: ['Pending', 'Completed', 'Failed'],
          default: null,
        },
        transactionId: { type: String, default: null },
        paymentDate: { type: Date, default: null },
      },
      setupGuide: {
        type: [
          {
            stepId: { type: Number, required: true },
            title: { type: String, required: true }, // Add title field
            isCompleted: { type: Boolean, default: false },
          },
        ],
        default: undefined, // This field is only initialized for Store Owners
      },
    },
    storeEmployeeDetails: {
      storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
      jobTitle: { type: String, default: null },
      permissions: { type: [String], default: [] },
    },
    appStaffDetails: {
      workLocation: { type: String, default: null },
      department: { type: String, default: null },
    },
    customerDetails: {
      orderHistory: { type: [Object], default: [] },
      preferredPaymentMethod: { type: String, default: null },
      location: {
        address: { type: String, default: null },
        city: { type: String, default: null },
        state: { type: String, default: null },
        zipCode: { type: String, default: null },
      },
      wishlist: { type: [Object], default: [] },
    },
  },
  temporalPin: {
    code: { type: String, default: null },
    expiresAt: { type: Date, default: null },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  username: { type: String, required: true, unique: true },
});

// Pre-save hook to initialize setup guide only for Store Owners
UserSchema.pre('save', function (next) {
  if (
    this.isNew &&
    this.role === 'Store Owner' &&
    (!this.additionalDetails.storeOwnerDetails.setupGuide ||
      this.additionalDetails.storeOwnerDetails.setupGuide.length === 0)
  ) {
    this.additionalDetails.storeOwnerDetails.setupGuide = [
      { stepId: 1, title: 'Name your product', isCompleted: false },
      { stepId: 2, title: 'Add your product', isCompleted: false },
      { stepId: 3, title: 'Customize your online store', isCompleted: false },
      { stepId: 4, title: 'Add pages to your store', isCompleted: false },
      { stepId: 5, title: 'Organize navigation', isCompleted: false },
      { stepId: 6, title: 'Shipment and delivery', isCompleted: false },
      { stepId: 7, title: 'Payment setup', isCompleted: false },
    ];
  }
  next();
});

// Create the User model
const User = mongoose.model('User', UserSchema, 'user');

module.exports = User;
