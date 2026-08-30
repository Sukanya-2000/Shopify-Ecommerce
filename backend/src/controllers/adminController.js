const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const jsonStore = require("../data/jsonStore");
const { usingJsonStore } = require("../config/store");
const asyncHandler = require("../utils/asyncHandler");
const { currencyPayload, normalizeCurrency } = require("../utils/currency");

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProduct(input) {
  const title = String(input.title || "").trim();
  const handle = slugify(input.handle || title);
  const quantity = input.inventory?.quantity ?? input.quantity ?? 0;

  return {
    handle,
    title,
    descriptionHtml: input.descriptionHtml || "",
    vendor: input.vendor || "CyberNest",
    category: input.category || "",
    type: input.type || "",
    tags: Array.isArray(input.tags)
      ? input.tags
      : String(input.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean),
    published: input.published !== false,
    option: {
      name: input.option?.name || "Title",
      value: input.option?.value || "Default Title"
    },
    sku: input.sku || handle.toUpperCase(),
    grams: Number(input.grams || 0),
    inventory: {
      tracker: input.inventory?.tracker || "shopify",
      quantity: Math.max(0, Math.floor(Number(quantity))),
      policy: input.inventory?.policy || "deny"
    },
    fulfillmentService: input.fulfillmentService || "manual",
    price: Number(input.price || 0),
    compareAtPrice: input.compareAtPrice === "" || input.compareAtPrice == null ? null : Number(input.compareAtPrice),
    requiresShipping: input.requiresShipping !== false,
    taxable: input.taxable !== false,
    image: {
      src: input.image?.src || input.imageUrl || "",
      alt: input.image?.alt || input.title || ""
    },
    giftCard: Boolean(input.giftCard),
    status: input.status || "active"
  };
}

const getSummary = asyncHandler(async (req, res) => {
  if (usingJsonStore()) {
    res.json(await jsonStore.getAdminSummary());
    return;
  }

  const [products, activeProducts, orders, customers, lowStock] = await Promise.all([
    Product.countDocuments({}),
    Product.countDocuments({ status: "active" }),
    Order.find({}),
    User.countDocuments({ role: "customer" }),
    Product.countDocuments({ "inventory.quantity": { $gt: 0, $lt: 5 } })
  ]);
  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  res.json({ products, activeProducts, orders: orders.length, customers, revenue: Number(revenue.toFixed(2)), lowStock });
});

const listProducts = asyncHandler(async (req, res) => {
  if (usingJsonStore()) {
    res.json({ items: await jsonStore.listAdminProducts() });
    return;
  }

  res.json({ items: await Product.find({}).sort({ updatedAt: -1 }) });
});

const listUsers = asyncHandler(async (req, res) => {
  if (usingJsonStore()) {
    res.json({ items: await jsonStore.listAdminUsers() });
    return;
  }

  const [users, orders] = await Promise.all([
    User.find({}).select("-passwordHash").sort({ updatedAt: -1 }),
    Order.find({}).sort({ createdAt: -1 })
  ]);

  res.json({
    items: users.map((user) => {
      const userOrders = orders.filter((order) => String(order.user) === String(user._id));
      return {
        ...user.toObject(),
        cart: { items: [], itemCount: 0, subtotal: 0 },
        wishlist: { items: [], total: 0 },
        orders: userOrders,
        totalSpent: Number(userOrders.reduce((sum, order) => sum + Number(order.total || 0), 0).toFixed(2))
      };
    })
  });
});

const saveProduct = asyncHandler(async (req, res) => {
  const product = normalizeProduct(req.body);
  if (!product.title || !product.handle) {
    res.status(400);
    throw new Error("Product title is required");
  }

  if (usingJsonStore()) {
    const existing = await jsonStore.getProductByHandle(req.params.handle || product.handle);
    const saved = existing ? await jsonStore.updateProduct(existing.handle, product) : await jsonStore.createProduct(product);
    res.status(existing ? 200 : 201).json(saved);
    return;
  }

  const saved = await Product.findOneAndUpdate({ handle: req.params.handle || product.handle }, product, {
    new: true,
    runValidators: true,
    upsert: true
  });
  res.status(req.params.handle ? 200 : 201).json(saved);
});

const deleteProduct = asyncHandler(async (req, res) => {
  if (usingJsonStore()) {
    const deleted = await jsonStore.deleteProduct(req.params.handle);
    if (!deleted) {
      res.status(404);
      throw new Error("Product not found");
    }
    res.status(204).send();
    return;
  }

  await Product.findOneAndDelete({ handle: req.params.handle });
  res.status(204).send();
});

const getSiteSettings = asyncHandler(async (req, res) => {
  if (!usingJsonStore()) {
    res.json(currencyPayload({ storeName: "CyberNest", tagline: "Connected home essentials", announcement: "Free shipping on orders over $100", currency: "USD" }));
    return;
  }

  res.json(currencyPayload(await jsonStore.getSiteSettings()));
});

const updateSiteSettings = asyncHandler(async (req, res) => {
  if (!usingJsonStore()) {
    res.status(501);
    throw new Error("Theme settings persistence is available in JSON demo mode");
  }

  res.json(currencyPayload(await jsonStore.updateSiteSettings({ ...req.body, currency: normalizeCurrency(req.body.currency) })));
});

module.exports = { deleteProduct, getSiteSettings, getSummary, listProducts, listUsers, saveProduct, updateSiteSettings };





