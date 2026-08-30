const express = require("express");
const jsonStore = require("../data/jsonStore");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const brands = await jsonStore.listBrands();
    res.json({ items: brands, total: brands.length });
  })
);

module.exports = router;
