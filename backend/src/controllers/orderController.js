const Order = require("../models/Order");
const Product = require("../models/Product");
const jsonStore = require("../data/jsonStore");
const { usingJsonStore } = require("../config/store");
const asyncHandler = require("../utils/asyncHandler");

const createOrder = asyncHandler(async (req, res) => {
  const { items = [], customer, shippingAddress } = req.body;

  if (!items.length) {
    res.status(400);
    throw new Error("At least one order item is required");
  }

  if (!customer?.name || !customer?.email) {
    res.status(400);
    throw new Error("Customer name and email are required");
  }

  const productIds = items.map((item) => item.product);
  const products = usingJsonStore()
    ? await jsonStore.getProductsByIds(productIds)
    : await Product.find({ _id: { $in: productIds } });
  const byId = new Map(products.map((product) => [product._id.toString(), product]));

  const orderItems = items.map((item) => {
    const product = byId.get(item.product);
    if (!product) {
      res.status(404);
      throw new Error(`Product not found: ${item.product}`);
    }

    const quantity = Math.max(Number(item.quantity) || 1, 1);
    if (product.inventory.quantity < quantity && product.inventory.policy !== "continue") {
      res.status(409);
      throw new Error(`Insufficient inventory for ${product.title}`);
    }

    return {
      product: product._id,
      title: product.title,
      sku: product.sku,
      quantity,
      price: product.price
    };
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 100 ? 0 : 8.99;
  const tax = Number((subtotal * 0.08).toFixed(2));
  const total = Number((subtotal + shipping + tax).toFixed(2));

  const orderInput = {
    user: req.user?._id,
    customer,
    shippingAddress,
    items: orderItems,
    subtotal,
    shipping,
    tax,
    total,
    status: "paid"
  };

  if (usingJsonStore()) {
    const order = await jsonStore.createOrder(orderInput);
    res.status(201).json(order);
    return;
  }

  const order = await Order.create(orderInput);

  await Promise.all(
    orderItems.map((item) =>
      Product.updateOne(
        { _id: item.product, "inventory.policy": { $ne: "continue" } },
        { $inc: { "inventory.quantity": -item.quantity } }
      )
    )
  );

  res.status(201).json(order);
});

const listOrders = asyncHandler(async (req, res) => {
  if (usingJsonStore()) {
    const orders = await jsonStore.listOrders(req.user);
    res.json(orders);
    return;
  }

  const query = req.user.role === "admin" ? {} : { user: req.user._id };
  const orders = await Order.find(query).sort({ createdAt: -1 });
  res.json(orders);
});

module.exports = { createOrder, listOrders };
