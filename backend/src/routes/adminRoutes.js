const express = require("express");
const {
  deleteProduct,
  getSiteSettings,
  getSummary,
  listProducts,
  listUsers,
  saveProduct,
  updateSiteSettings
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.use(protect, adminOnly);

router.get("/summary", getSummary);
router.get("/products", listProducts);
router.get("/users", listUsers);
router.post("/products", saveProduct);
router.put("/products/:handle", saveProduct);
router.delete("/products/:handle", deleteProduct);
router.get("/settings", getSiteSettings);
router.put("/settings", updateSiteSettings);

module.exports = router;
