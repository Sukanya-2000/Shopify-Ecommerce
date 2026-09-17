const jsonStore = require("../data/jsonStore");
const { usingJsonStore } = require("../config/store");
const asyncHandler = require("../utils/asyncHandler");
const { currencyPayload } = require("../utils/currency");

const getPublicSettings = asyncHandler(async (req, res) => {
  if (!usingJsonStore()) {
    res.json(currencyPayload({
      storeName: "CyberNest",
      tagline: "Connected home essentials",
      announcement: "Free shipping on orders over $100",
      currency: "USD"
    }));
    return;
  }

  res.json(currencyPayload(await jsonStore.getSiteSettings()));
});

module.exports = { getPublicSettings };
