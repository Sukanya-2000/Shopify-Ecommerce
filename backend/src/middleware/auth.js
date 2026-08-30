const jwt = require("jsonwebtoken");
const User = require("../models/User");
const jsonStore = require("../data/jsonStore");
const { usingJsonStore } = require("../config/store");
const { jwtSecret } = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401);
    throw new Error("Authentication token required");
  }

  const payload = jwt.verify(token, jwtSecret);
  const user = usingJsonStore()
    ? await jsonStore.findUserById(payload.id)
    : await User.findById(payload.id).select("-passwordHash");

  if (!user) {
    res.status(401);
    throw new Error("User not found");
  }

  req.user = user;
  next();
});

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    res.status(403);
    next(new Error("Admin access required"));
    return;
  }

  next();
}

module.exports = { protect, adminOnly };
