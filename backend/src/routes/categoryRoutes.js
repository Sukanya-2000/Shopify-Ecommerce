const express = require("express");
const { createCategory, deleteCategory, listCategories, updateCategory } = require("../controllers/categoryController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.get("/", listCategories);
router.post("/", protect, adminOnly, createCategory);
router.put("/:name", protect, adminOnly, updateCategory);
router.delete("/:name", protect, adminOnly, deleteCategory);

module.exports = router;
