const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const jsonStore = require("../data/jsonStore");
const { usingJsonStore } = require("../config/store");
const asyncHandler = require("../utils/asyncHandler");
const { jwtSecret } = require("../config/env");

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, jwtSecret, { expiresIn: "7d" });
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email, and password are required");
  }

  const exists = usingJsonStore() ? await jsonStore.emailExists(email) : await User.exists({ email });
  if (exists) {
    res.status(409);
    throw new Error("Email is already registered");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = usingJsonStore()
    ? await jsonStore.createUser({ name, email, passwordHash })
    : await User.create({ name, email, passwordHash });

  res.status(201).json({
    token: signToken(user),
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = usingJsonStore() ? await jsonStore.findUserByEmail(email) : await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.json({
    token: signToken(user),
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

module.exports = { register, login, me };
