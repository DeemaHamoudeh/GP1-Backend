
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Product = require("../models/productModel");
const Store = require("../models/storeModel");
const mongoose = require("mongoose");
const addProduct = async (req, res) => {
  try {
    const { title, description, category, price, images, status, variants } = req.body;
    const userId = req.user.id;

    const store = await Store.findOne({ ownerId: userId });
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found for this user!" });
    }

    const storeId = store._id;

    if (!title || !category || !price || !images || images.length === 0) {
      return res.status(400).json({ success: false, message: "Missing required fields or images!" });
    }

    const newProduct = new Product({
      storeId,
      title,
      description: description || "",
      category,
      price,
      images,
      status: status || "Active",
      variants: variants || [],
      variantCombinations: [],
    });

    if (variants && variants.length > 0) {
      const variantNames = variants.map((v) => v.name);
      const variantValues = variants.map((v) => v.values);

      const generateCombinations = (arr, index = 0, current = {}) => {
        if (index === arr.length) {
          return [current];
        }
        let combinations = [];
        for (let value of arr[index]) {
          combinations = combinations.concat(
            generateCombinations(arr, index + 1, { ...current, [variantNames[index]]: value })
          );
        }
        return combinations;
      };

      const combinations = generateCombinations(variantValues);

      newProduct.variantCombinations = await Promise.all(
        combinations.map(async (combo, index) => {
          let generatedSKU = `${title.replace(/\s+/g, "-").toLowerCase()}-${storeId}-${index}-${Date.now()}`;

          // ✅ تأكد من أن `SKU` غير مكرر
          while (await Product.findOne({ "variantCombinations.sku": generatedSKU })) {
            generatedSKU = `${title.replace(/\s+/g, "-").toLowerCase()}-${storeId}-${index}-${Date.now()}`;
          }

          return {
            attributes: combo,
            price: price,
            stock: 0,
            sku: generatedSKU,
            image: null,
          };
        })
      );
    }

    newProduct.totalStock = newProduct.variantCombinations.reduce((sum, variant) => sum + variant.stock, 0);

    await newProduct.save();

    res.status(201).json({ success: true, message: "Product added successfully", product: newProduct });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};


const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find(); // ✅ Fetch all products from DB

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getProductById = async (req, res) => {
  try {
    const id = req.params.id.trim();
    console.log("Fetching product with ID:", id);
    console.log("Type of ID received:", typeof id);
    console.log("ID Length:", id.length);

    // ✅ Check if the ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log("❌ Invalid ObjectId detected:", id);
      return res.status(400).json({ success: false, message: "Invalid Product ID format!" });
    }

    const objectId = new mongoose.Types.ObjectId(id); // ✅ Convert it properly
    console.log("Converted ObjectId:", objectId);

    const product = await Product.findById(objectId);
    console.log("Product found:", product);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found!" });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    console.error("❌ Error fetching product:", error);
    res.status(500).json({ success: false, message: "Server error!", error: error.message });
  }
};

const getStoreProducts = async (req, res) => {
  try {
    const storeId = req.params.storeId.trim(); // ✅ Ensure no spaces

    console.log("Fetching products for Store ID:", storeId);

    // ✅ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      console.log("❌ Invalid Store ID detected:", storeId);
      return res.status(400).json({ success: false, message: "Invalid Store ID format!" });
    }

    // ✅ Fetch all products for the given store ID
    const products = await Product.find({ storeId });

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: "No products found for this store!" });
    }

    res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    console.error("Error fetching store products:", error);
    res.status(500).json({ success: false, message: "Server error!", error: error.message });
  }
};
const deleteProduct = async (req, res) => {
  try {
    const id = req.params.id.trim();
    const userId = req.user.id;

    console.log("🗑️ Deleting product with ID:", id);

    // ✅ التحقق من أن `id` هو ObjectId صحيح
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Product ID format!" });
    }

    // ✅ البحث عن المنتج أولًا
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found!" });
    }

    // ✅ التحقق من أن المستخدم يملك المتجر الذي يحتوي على المنتج
    const store = await Store.findOne({ _id: product.storeId, ownerId: userId });
    if (!store) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this product!" });
    }

    // ✅ حذف المنتج
    await Product.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: "Product deleted successfully!" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ success: false, message: "Server error!", error: error.message });
  }
};



const updateProduct = async (req, res) => {
  try {
    const id = req.params.id.trim();// Product ID from URL
    const userId = req.user.id; // Extract user ID from token
    const { title, description, category, price, images, status, variants } = req.body;

    console.log("Updating product with ID:", id);
    console.log("User ID from token:", userId);

    // ✅ 1. Validate Product ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Product ID format!" });
    }

    // ✅ 2. Find Product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found!" });
    }

    // ✅ 3. Check if User Owns the Store Linked to the Product
    const store = await Store.findOne({ _id: product.storeId, ownerId: userId });
    if (!store) {
      return res.status(403).json({ success: false, message: "Unauthorized to update this product!" });
    }

    // ✅ 4. Update Product Fields
    if (title) product.title = title;
    if (description) product.description = description;
    if (category) product.category = category;
    if (price) product.price = price;
    if (images && images.length > 0) product.images = images;
    if (status) product.status = status;

    // ✅ 5. Handle Variants & Generate New Variant Combinations (if variants exist)
    if (variants && variants.length > 0) {
      const variantNames = variants.map((v) => v.name);
      const variantValues = variants.map((v) => v.values);

      const generateCombinations = (arr, index = 0, current = {}) => {
        if (index === arr.length) {
          return [current];
        }
        let combinations = [];
        for (let value of arr[index]) {
          combinations = combinations.concat(
            generateCombinations(arr, index + 1, { ...current, [variantNames[index]]: value })
          );
        }
        return combinations;
      };

      const combinations = generateCombinations(variantValues);

      product.variants = variants;
      product.variantCombinations = combinations.map((combo, index) => ({
        attributes: combo,
        price: price, // Default price
        stock: 0, // Stock remains the same
        sku: `${title.replace(/\s+/g, "-").toLowerCase()}-${index}`,
        image: null,
      }));
    }

    // ✅ 6. Save Changes
    await product.save();

    res.status(200).json({ success: true, message: "Product updated successfully!", product });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ success: false, message: "Server error!", error: error.message });
  }
};


module.exports = { addProduct, getAllProducts, getProductById,getStoreProducts,deleteProduct , updateProduct};


