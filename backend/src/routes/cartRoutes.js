const express = require("express");
const jsonStore = require("../data/jsonStore");
const { protect } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(protect);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await jsonStore.getUserCart(req.user._id));
  })
);

router.post(
  "/items",
  asyncHandler(async (req, res) => {
    const cart = await jsonStore.addToCart(req.user._id, req.body.productId || req.body.handle, req.body.quantity);
    if (!cart) {
      res.status(404);
      throw new Error("Product not found");
    }
    res.status(201).json(cart);
  })
);

router.put(
  "/items/:productId",
  asyncHandler(async (req, res) => {
    const cart = await jsonStore.updateCartItem(req.user._id, req.params.productId, req.body.quantity);
    if (!cart) {
      res.status(404);
      throw new Error("Product not found");
    }
    res.json(cart);
  })
);

router.delete(
  "/items/:productId",
  asyncHandler(async (req, res) => {
    const cart = await jsonStore.updateCartItem(req.user._id, req.params.productId, 0);
    if (!cart) {
      res.status(404);
      throw new Error("Product not found");
    }
    res.json(cart);
  })
);

module.exports = router;
