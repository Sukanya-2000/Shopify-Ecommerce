const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    handle: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    descriptionHtml: { type: String, default: "" },
    vendor: { type: String, default: "CyberNest" },
    category: { type: String, default: "" },
    type: { type: String, default: "" },
    tags: [{ type: String, trim: true }],
    published: { type: Boolean, default: true },
    option: {
      name: { type: String, default: "Title" },
      value: { type: String, default: "Default Title" }
    },
    sku: { type: String, required: true, unique: true, trim: true },
    grams: { type: Number, default: 0 },
    inventory: {
      tracker: { type: String, default: "shopify" },
      quantity: { type: Number, default: 0 },
      policy: { type: String, default: "deny" }
    },
    fulfillmentService: { type: String, default: "manual" },
    price: { type: Number, required: true },
    compareAtPrice: { type: Number, default: null },
    requiresShipping: { type: Boolean, default: true },
    taxable: { type: Boolean, default: true },
    image: {
      src: { type: String, default: "" },
      alt: { type: String, default: "" }
    },
    giftCard: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "draft", "archived"],
      default: "active"
    }
  },
  { timestamps: true }
);

productSchema.index({ title: "text", tags: "text", type: "text", category: "text" });

module.exports = mongoose.model("Product", productSchema);
