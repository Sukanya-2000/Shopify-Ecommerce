const Product = require("../models/Product");
const jsonStore = require("../data/jsonStore");
const { usingJsonStore } = require("../config/store");
const asyncHandler = require("../utils/asyncHandler");

const listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 100);
  const skip = (page - 1) * limit;
  const query = {};

  if (req.query.type) query.type = req.query.type;
  if (req.query.category) query.category = req.query.category;
  if (req.query.status) query.status = req.query.status;
  if (req.query.tag) query.tags = req.query.tag;
  if (req.query.search) query.$text = { $search: req.query.search };

  if (usingJsonStore()) {
    const { items, total } = await jsonStore.listProducts({
      page,
      limit,
      query: {
        type: req.query.type,
        category: req.query.category,
        status: req.query.status,
        tag: req.query.tag,
        search: req.query.search,
        available: req.query.available,
        vendor: req.query.vendor,
        sortBy: req.query.sort_by
      }
    });

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
    return;
  }

  const [items, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(query)
  ]);

  res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

const getProduct = asyncHandler(async (req, res) => {
  if (usingJsonStore()) {
    const product = await jsonStore.getProductByHandle(req.params.handle);

    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }

    res.json(product);
    return;
  }

  const product = await Product.findOne({ handle: req.params.handle });

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json(product);
});

const createProduct = asyncHandler(async (req, res) => {
  if (usingJsonStore()) {
    const product = await jsonStore.createProduct(req.body);
    res.status(201).json(product);
    return;
  }

  const product = await Product.create(req.body);
  res.status(201).json(product);
});

const updateProduct = asyncHandler(async (req, res) => {
  if (usingJsonStore()) {
    const product = await jsonStore.updateProduct(req.params.handle, req.body);

    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }

    res.json(product);
    return;
  }

  const product = await Product.findOneAndUpdate({ handle: req.params.handle }, req.body, {
    new: true,
    runValidators: true
  });

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json(product);
});

const deleteProduct = asyncHandler(async (req, res) => {
  if (usingJsonStore()) {
    const product = await jsonStore.deleteProduct(req.params.handle);

    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }

    res.status(204).send();
    return;
  }

  const product = await Product.findOneAndDelete({ handle: req.params.handle });

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.status(204).send();
});

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
