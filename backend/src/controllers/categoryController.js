const jsonStore = require("../data/jsonStore");
const asyncHandler = require("../utils/asyncHandler");

const listCategories = asyncHandler(async (req, res) => {
  res.json({ items: await jsonStore.listCategories() });
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await jsonStore.createCategory(req.body.name);
  if (!category) {
    res.status(400);
    throw new Error("Category name is required");
  }
  res.status(201).json(category);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await jsonStore.updateCategory(req.params.name, req.body.name);
  if (!category) {
    res.status(400);
    throw new Error("Category name is required");
  }
  res.json(category);
});

const deleteCategory = asyncHandler(async (req, res) => {
  const deleted = await jsonStore.deleteCategory(req.params.name);
  if (!deleted) {
    res.status(400);
    throw new Error("Category name is required");
  }
  res.status(204).send();
});

module.exports = { createCategory, deleteCategory, listCategories, updateCategory };
