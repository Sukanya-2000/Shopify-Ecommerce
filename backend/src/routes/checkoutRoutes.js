const express = require("express");
const jsonStore = require("../data/jsonStore");
const { protect } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { stripeSecretKey } = require("../config/env");
const { convertCurrency, normalizeCurrency } = require("../utils/currency");

const router = express.Router();

function appendLineItem(params, index, item, currency) {
  const unitAmount = Math.max(Math.round(convertCurrency(item.product.price, currency) * 100), 50);

  params.append(`line_items[${index}][quantity]`, String(item.quantity));
  params.append(`line_items[${index}][price_data][currency]`, currency.toLowerCase());
  params.append(`line_items[${index}][price_data][unit_amount]`, String(unitAmount));
  params.append(`line_items[${index}][price_data][product_data][name]`, item.product.title);

  if (item.product.image?.src) {
    params.append(`line_items[${index}][price_data][product_data][images][0]`, item.product.image.src);
  }
}

function checkoutReturnUrl(origin, status) {
  const sessionQuery = status === "success" ? "&session_id={CHECKOUT_SESSION_ID}" : "";
  return `${origin}/cart?checkout=${status}${sessionQuery}`;
}

router.post(
  "/session",
  protect,
  asyncHandler(async (req, res) => {
    if (!stripeSecretKey) {
      res.status(500);
      throw new Error("Stripe secret key is not configured");
    }

    const cart = await jsonStore.getUserCart(req.user._id);
    if (!cart.itemCount) {
      res.status(400);
      throw new Error("Your cart is empty");
    }

    const origin = req.body.origin || "http://127.0.0.1:9292";
    const params = new URLSearchParams({
      mode: "payment",
      success_url: checkoutReturnUrl(origin, "success"),
      cancel_url: checkoutReturnUrl(origin, "cancelled"),
      customer_email: req.user.email,
      "metadata[user_id]": String(req.user._id)
    });

    const settings = await jsonStore.getSiteSettings();
    const currency = normalizeCurrency(settings.currency);
    cart.items.forEach((item, index) => appendLineItem(params, index, item, currency));

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });
    const payload = await response.json();

    if (!response.ok) {
      res.status(response.status);
      throw new Error(payload.error?.message || "Unable to create Stripe checkout session");
    }

    res.json({ id: payload.id, url: payload.url });
  })
);

router.post(
  "/complete",
  protect,
  asyncHandler(async (req, res) => {
    const sessionId = req.body.sessionId;
    if (!sessionId) {
      res.status(400);
      throw new Error("Stripe checkout session is required");
    }

    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`
      }
    });
    const session = await response.json();

    if (!response.ok) {
      res.status(response.status);
      throw new Error(session.error?.message || "Unable to verify Stripe checkout session");
    }

    if (session.payment_status !== "paid" || String(session.metadata?.user_id) !== String(req.user._id)) {
      res.status(400);
      throw new Error("Payment has not been completed");
    }

    const result = await jsonStore.completeCheckout(req.user._id);
    if (!result) {
      res.status(404);
      throw new Error("User not found");
    }

    res.json(result);
  })
);

module.exports = router;


