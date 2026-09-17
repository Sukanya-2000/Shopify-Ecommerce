const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { clientOrigin, nodeEnv } = require("./config/env");
const productRoutes = require("./routes/productRoutes");
const brandRoutes = require("./routes/brandRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const cartRoutes = require("./routes/cartRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const adminRoutes = require("./routes/adminRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        imgSrc: ["'self'", "data:", "https://images.unsplash.com"]
      }
    }
  })
);
app.use(cors({ origin: clientOrigin === "*" ? true : clientOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));

const adminPublicPath = path.resolve(__dirname, "../public/admin");

app.get(["/admin", "/admin/", "/admin-portal", "/admin-portal/"], (req, res) => {
  res.sendFile(path.join(adminPublicPath, "index.html"));
});

app.use("/admin", express.static(adminPublicPath));
app.use("/admin-portal", express.static(adminPublicPath));

if (nodeEnv !== "test") {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "cybernest-backend",
    endpoints: {
      health: "/api/health",
      products: "/api/products",
      brands: "/api/brands",
      categories: "/api/categories",
      cart: "/api/cart",
      wishlist: "/api/wishlist",
      checkout: "POST /api/checkout/session",
      settings: "/api/settings",
      admin: {
        dashboard: "/admin",
        summary: "GET /api/admin/summary",
        products: "GET/POST/PUT/DELETE /api/admin/products",
        settings: "GET/PUT /api/admin/settings"
      },
      productDetail: "/api/products/:handle",
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        me: "GET /api/auth/me"
      },
      orders: "GET/POST /api/orders"
    }
  });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "cybernest-backend" });
});

app.use("/api/products", productRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;


