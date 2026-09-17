const express = require("express");
const { createOrder, listOrders } = require("../controllers/orderController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.route("/").get(protect, listOrders).post(protect, createOrder);

module.exports = router;
