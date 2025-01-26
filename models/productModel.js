const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number, // ✅ Default price (if no variants)
      required: true,
      min: 0,
    },
    images: [
      {
        type: String, // ✅ URLs of images for the product
        required: true,
      },
    ],
    status: {
      type: String,
      enum: ["Active", "Draft", "Hidden"],
      default: "Active",
    },
    totalStock: {
      type: Number, // ✅ Sum of all stock in `variantCombinations`
      default: 0,
      min: 0,
    },
    variants: [
      {
        name: {
          type: String,
          enum: ["Color", "Size", "Material", "Style", "Custom"],
          required: true,
        },
        values: [String], // ✅ Example: ["Red", "Blue"], ["S", "M"]
      },
    ],
    variantCombinations: [
      {
        attributes: {
          type: Map, // ✅ Example: { "Color": "Red", "Size": "M" }
          of: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        stock: {
          type: Number,
          required: true,
          min: 0,
        },
        sku: {
          type: String,
          unique: true, // ✅ Each combination must have a unique SKU
          required: true,
        },
        image: {
          type: String, // ✅ Image URL for this variant
          default: null,
        },
      },
    ],
  },
  { timestamps: true }
);

// ✅ تحديث `totalStock` تلقائيًا عند حفظ المنتج
ProductSchema.pre("save", function (next) {
  this.totalStock = this.variantCombinations.reduce((sum, variant) => sum + variant.stock, 0);
  next();
});

const Product = mongoose.model("Product", ProductSchema, "product");
module.exports = Product;
