const express = require("express");
const jsonStore = require("../data/jsonStore");
const { protect } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(protect);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await jsonStore.getUserWishlist(req.user._id));
  })
);

router.post(
  "/items",
  asyncHandler(async (req, res) => {
    const wishlist = await jsonStore.toggleWishlist(req.user._id, req.body.productId || req.body.handle);
    if (!wishlist) {
      res.status(404);
      throw new Error("Product not found");
    }
    res.json(wishlist);
  })
);

module.exports = router;
