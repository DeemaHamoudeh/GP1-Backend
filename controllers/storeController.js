
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Store = require("../models/storeModel");


const getStoreDetails = async (req, res) => {
  try {
    console.log("🔍 Fetching store details for:", req.params.id);
    console.log("🛠 Authenticated user:", req.user);

    // Find the store by ID
    const store = await Store.findById(req.params.id);
    if (!store) {
      console.log("❌ Store not found");
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    // ✅ Ensure the store belongs to the authenticated user
    if (store.ownerId.toString() !== req.user.id.toString()) {
      console.log("❌ Unauthorized access: Store does not belong to the user");
      console.log("store.ownerId.toString():",store.ownerId.toString());
      console.log("req.user.id: ",req.user.id);
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    console.log("✅ Store details found:", store);
    res.status(200).json({ success: true, data: store });

  } catch (error) {
    console.error("❌ Server error:", error.message);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
const updateStoreDetails = async (req, res) => {
  try {
    console.log("📥 Received update request:", req.body);

    // ✅ Use optional chaining `?.` to avoid undefined errors
    const { name, email, phone, logo, description, address, categories } = req.body || {};

    console.log("📞 Received Phone:", phone);

    if (!phone) {
      console.log("⚠️ Phone is undefined or missing from request body.");
    }

    // 🔐 Ensure the store belongs to the user
    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    if (store.ownerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    // ✅ Validate phone format
    const phoneRegex = /^[0-9+\-\s]{8,19}$/;
    if (phone && !phoneRegex.test(phone)) {
      console.log("❌ Invalid phone format:", phone);
      return res.status(400).json({ success: false, message: "Invalid phone number format" });
    }

    // ✅ Update only provided fields
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (logo) updateData.logo = logo;
    if (description) updateData.description = description;
    if (address) updateData.address = address;
    if (categories) updateData.categories = categories;

    console.log("🔄 Updating store with:", updateData);

    // ✅ Ensure there's at least one field to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "No valid update fields provided" });
    }

    const updatedStore = await Store.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    console.log("✅ Store updated successfully:", updatedStore);
    res.status(200).json({ success: true, message: "Store updated successfully", store: updatedStore });

  } catch (error) {
    console.error("❌ Error updating store:", error.message);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};



module.exports = { getStoreDetails, updateStoreDetails };
