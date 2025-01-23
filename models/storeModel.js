const mongoose = require("mongoose");

// ✅ Address Sub-Schema for better structure
const AddressSchema = new mongoose.Schema({
  city: { type: String,  default: "" , trim: true },
  zipCode: { type: String,  default: "" , trim: true },
  country: { type: String, default: "" ,  trim: true }
});

// ✅ Store Schema
const StoreSchema = new mongoose.Schema({
  ownerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  name: { type: String,  default: "" ,trim: true },
  email: { type: String, default: "" ,  unique: true, trim: true, lowercase: true },
  phone: { type: String, default: "" , match: /^[0-9+\-\s]{8,19}$/, trim: true },
  logo: { type: String, default: "" },
  description: { type: String, default: "", trim: true },
  
  address: AddressSchema, // ✅ Use Address Sub-Schema

  categories: [{ 
    type: String, 
    enum: ["Fashion & Apparel", "Electronics", "Food & Beverage", "Health & Fitness", 
           "Handmade & Crafts", "Home & Living", "Beauty & Personal Care", 
           "Toys & Kids", "Automotive & Accessories", "Books & Stationery"]
  }],

  products: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Product" // ✅ Connect with Product Model
  }],

  createdAt: { type: Date, default: Date.now }
});

const Store = mongoose.model('Store', StoreSchema, 'store');

module.exports = Store;

