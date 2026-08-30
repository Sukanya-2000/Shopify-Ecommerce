const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const dbPath = path.resolve(__dirname, "../../data/dev-db.json");

async function ensureDataDir() {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function now() {
  return new Date().toISOString();
}

function createId() {
  return crypto.randomBytes(12).toString("hex");
}

async function read() {
  try {
    const content = await fs.readFile(dbPath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { products: [], users: [], orders: [], brands: [], siteSettings: defaultSiteSettings() };
  }
}

async function write(data) {
  await ensureDataDir();
  await fs.writeFile(dbPath, `${JSON.stringify(data, null, 2)}\n`);
}

function defaultSiteSettings() {
  return {
    storeName: "CyberNest",
    tagline: "Connected home essentials",
    announcement: "Free shipping on orders over $100",
    supportEmail: "support@cybernest.local",
    currency: "USD",
    primaryColor: "#0f766e",
    accentColor: "#f97316",
    secondaryColor: "#2563eb",
    borderColor: "#d9e2ec",
    mutedColor: "#64748b",
    surfaceColor: "#ffffff",
    headerBackgroundColor: "#0b1220",
    headerTextColor: "#ffffff",
    buttonTextColor: "#ffffff",
    cornerRadius: 8,
    contrastMode: "balanced",
    backgroundColor: "#f8fafc",
    textColor: "#111827",
    heroTitle: "Upgrade every corner of your connected home",
    heroSubtitle: "Smart devices, desk gear, and everyday tech curated for modern living.",
    buttonLabel: "Shop new arrivals",
    logoUrl: "",
    heroImageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1600&q=80"
  };
}

function normalizeCategoryName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function matchesProduct(product, query) {
  if (query.type && product.type !== query.type) return false;
  if (query.category && product.category !== query.category) return false;
  if (query.status && product.status !== query.status) return false;
  if (query.tag && !product.tags?.includes(query.tag)) return false;
  if (query.available === "true" && Number(product.inventory?.quantity || 0) <= 0) return false;
  if (query.available === "false" && Number(product.inventory?.quantity || 0) > 0) return false;
  if (query.vendor && product.vendor !== query.vendor) return false;

  if (query.search) {
    const search = query.search.toLowerCase();
    const haystack = [product.title, product.type, product.category, ...(product.tags || [])]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(search)) return false;
  }

  return true;
}

function compareProducts(sortBy) {
  const sorters = {
    "title-ascending": (a, b) => a.title.localeCompare(b.title),
    "title-descending": (a, b) => b.title.localeCompare(a.title),
    "price-ascending": (a, b) => a.price - b.price,
    "price-descending": (a, b) => b.price - a.price,
    "created-ascending": (a, b) => String(a.createdAt).localeCompare(String(b.createdAt)),
    "created-descending": (a, b) => String(b.createdAt).localeCompare(String(a.createdAt))
  };

  return sorters[sortBy] || sorters["title-ascending"];
}

async function replaceAll(nextData) {
  await write(clone(nextData));
}

async function listProducts({ page, limit, query }) {
  const db = await read();
  const items = db.products
    .filter((product) => matchesProduct(product, query))
    .sort(compareProducts(query.sortBy));
  const total = items.length;
  const skip = (page - 1) * limit;

  return {
    items: items.slice(skip, skip + limit),
    total
  };
}

async function getProductByHandle(handle) {
  const db = await read();
  return db.products.find((product) => product.handle === handle) || null;
}

async function getProductsByIds(ids) {
  const wanted = new Set(ids.map(String));
  const db = await read();
  return db.products.filter((product) => wanted.has(String(product._id)));
}

async function createProduct(input) {
  const db = await read();
  const timestamp = now();
  const product = { ...input, _id: createId(), createdAt: timestamp, updatedAt: timestamp };
  db.products.push(product);
  await write(db);
  return product;
}

async function updateProduct(handle, input) {
  const db = await read();
  const index = db.products.findIndex((product) => product.handle === handle);
  if (index === -1) return null;
  db.products[index] = { ...db.products[index], ...input, updatedAt: now() };
  await write(db);
  return db.products[index];
}

async function deleteProduct(handle) {
  const db = await read();
  const index = db.products.findIndex((product) => product.handle === handle);
  if (index === -1) return null;
  const [deleted] = db.products.splice(index, 1);
  await write(db);
  return deleted;
}

async function findUserByEmail(email) {
  const db = await read();
  return db.users.find((user) => user.email === String(email).toLowerCase()) || null;
}

async function findUserById(id) {
  const db = await read();
  return publicUser(db.users.find((user) => String(user._id) === String(id)));
}

async function emailExists(email) {
  return Boolean(await findUserByEmail(email));
}

async function createUser(input) {
  const db = await read();
  const timestamp = now();
  const user = {
    ...input,
    _id: createId(),
    email: String(input.email).toLowerCase(),
    role: input.role || "customer",
    cart: [],
    wishlist: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };
  db.users.push(user);
  await write(db);
  return user;
}

async function findOrCreateSocialUser(provider, profile = {}) {
  const email = String(profile.email || `${provider}.user@cybernest.local`).toLowerCase();
  const existing = await findUserByEmail(email);
  if (existing) return existing;

  return createUser({
    name: profile.name || `${provider[0].toUpperCase()}${provider.slice(1)} User`,
    email,
    passwordHash: `social:${provider}`,
    role: "customer"
  });
}

async function findProduct(identifier) {
  const db = await read();
  return db.products.find(
    (product) => String(product._id) === String(identifier) || product.handle === String(identifier)
  ) || null;
}

function summarizeProduct(product) {
  return {
    _id: product._id,
    handle: product.handle,
    title: product.title,
    vendor: product.vendor,
    price: product.price,
    image: product.image,
    inventory: product.inventory
  };
}

async function getUserCart(userId) {
  const db = await read();
  const user = db.users.find((entry) => String(entry._id) === String(userId));
  const cart = user?.cart || [];
  const items = cart
    .map((item) => {
      const product = db.products.find((entry) => String(entry._id) === String(item.product));
      if (!product) return null;
      return { ...item, product: summarizeProduct(product), lineTotal: Number((product.price * item.quantity).toFixed(2)) };
    })
    .filter(Boolean);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));

  return { items, itemCount, subtotal };
}

async function addToCart(userId, productIdentifier, quantity = 1) {
  const db = await read();
  const user = db.users.find((entry) => String(entry._id) === String(userId));
  const product = db.products.find(
    (entry) => String(entry._id) === String(productIdentifier) || entry.handle === String(productIdentifier)
  );
  if (!user || !product) return null;

  const stock = Number(product.inventory?.quantity || 0);
  if (stock <= 0) return null;

  const nextQuantity = Math.max(Number(quantity) || 1, 1);
  const existing = (user.cart || []).find((item) => String(item.product) === String(product._id));
  if (existing) existing.quantity = Math.min(existing.quantity + nextQuantity, stock);
  else {
    user.cart = user.cart || [];
    user.cart.push({ product: product._id, quantity: Math.min(nextQuantity, stock) });
  }
  user.updatedAt = now();
  await write(db);
  return getUserCart(userId);
}

async function updateCartItem(userId, productIdentifier, quantity) {
  const db = await read();
  const user = db.users.find((entry) => String(entry._id) === String(userId));
  const product = db.products.find(
    (entry) => String(entry._id) === String(productIdentifier) || entry.handle === String(productIdentifier)
  );
  if (!user || !product) return null;

  const stock = Number(product.inventory?.quantity || 0);
  user.cart = (user.cart || []).filter((item) => String(item.product) !== String(product._id));
  if (Number(quantity) > 0 && stock > 0) user.cart.push({ product: product._id, quantity: Math.min(Number(quantity), stock) });
  user.updatedAt = now();
  await write(db);
  return getUserCart(userId);
}

async function completeCheckout(userId) {
  const db = await read();
  const user = db.users.find((entry) => String(entry._id) === String(userId));
  if (!user) return null;

  const cart = await getUserCart(userId);
  if (!cart.itemCount) return { order: null, cart };

  const timestamp = now();
  const subtotal = cart.subtotal;
  const shipping = subtotal > 100 ? 0 : 8.99;
  const tax = Number((subtotal * 0.08).toFixed(2));
  const order = {
    _id: createId(),
    user: user._id,
    customer: { name: user.name, email: user.email },
    items: cart.items.map((item) => ({
      product: item.product._id,
      title: item.product.title,
      sku: item.product.sku || item.product.handle,
      quantity: item.quantity,
      price: item.product.price
    })),
    shippingAddress: {},
    subtotal,
    shipping,
    tax,
    total: Number((subtotal + shipping + tax).toFixed(2)),
    status: "paid",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  db.orders.push(order);
  for (const item of cart.items) {
    const product = db.products.find((entry) => String(entry._id) === String(item.product._id));
    if (product && product.inventory?.policy !== "continue") {
      product.inventory.quantity = Math.max(0, Number(product.inventory.quantity || 0) - Number(item.quantity || 0));
      product.updatedAt = timestamp;
    }
  }

  user.cart = [];
  user.updatedAt = timestamp;
  await write(db);

  return { order, cart: await getUserCart(userId) };
}

async function getUserWishlist(userId) {
  const db = await read();
  const user = db.users.find((entry) => String(entry._id) === String(userId));
  const ids = user?.wishlist || [];
  const items = ids
    .map((id) => db.products.find((product) => String(product._id) === String(id)))
    .filter(Boolean)
    .map(summarizeProduct);
  return { items, total: items.length };
}

async function toggleWishlist(userId, productIdentifier) {
  const db = await read();
  const user = db.users.find((entry) => String(entry._id) === String(userId));
  const product = db.products.find(
    (entry) => String(entry._id) === String(productIdentifier) || entry.handle === String(productIdentifier)
  );
  if (!user || !product) return null;

  user.wishlist = user.wishlist || [];
  const exists = user.wishlist.includes(product._id);
  user.wishlist = exists ? user.wishlist.filter((id) => id !== product._id) : [...user.wishlist, product._id];
  user.updatedAt = now();
  await write(db);
  return { active: !exists, ...(await getUserWishlist(userId)) };
}

async function createOrder(input) {
  const db = await read();
  const timestamp = now();
  const order = { ...input, _id: createId(), createdAt: timestamp, updatedAt: timestamp };
  db.orders.push(order);

  for (const item of input.items) {
    const product = db.products.find((entry) => String(entry._id) === String(item.product));
    if (product && product.inventory?.policy !== "continue") {
      product.inventory.quantity -= item.quantity;
      product.updatedAt = timestamp;
    }
  }

  await write(db);
  return order;
}

async function listOrders(user) {
  const db = await read();
  const orders = user.role === "admin" ? db.orders : db.orders.filter((order) => String(order.user) === String(user._id));
  return orders.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function listBrands() {
  const db = await read();
  return (db.brands || []).sort((a, b) => a.name.localeCompare(b.name));
}

async function listCategories() {
  const db = await read();
  const saved = Array.isArray(db.categories) ? db.categories : [];
  const productCategories = (db.products || [])
    .map((product) => normalizeCategoryName(product.category))
    .filter(Boolean);
  return [...new Set([...saved, ...productCategories])]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name }));
}

async function createCategory(name) {
  const category = normalizeCategoryName(name);
  if (!category) return null;

  const db = await read();
  const categories = Array.isArray(db.categories) ? db.categories : [];
  const exists = categories.some((item) => item.toLowerCase() === category.toLowerCase());
  if (!exists) {
    db.categories = [...categories, category].sort((a, b) => a.localeCompare(b));
    await write(db);
  }
  return { name: category };
}

async function updateCategory(currentName, nextName) {
  const current = normalizeCategoryName(currentName);
  const next = normalizeCategoryName(nextName);
  if (!current || !next) return null;

  const db = await read();
  const categories = Array.isArray(db.categories) ? db.categories : [];
  const categorySet = new Map(categories.map((name) => [name.toLowerCase(), name]));
  categorySet.delete(current.toLowerCase());
  categorySet.set(next.toLowerCase(), next);
  db.categories = [...categorySet.values()].sort((a, b) => a.localeCompare(b));

  const timestamp = now();
  for (const product of db.products || []) {
    if (normalizeCategoryName(product.category).toLowerCase() === current.toLowerCase()) {
      product.category = next;
      product.updatedAt = timestamp;
    }
  }

  await write(db);
  return { name: next };
}

async function deleteCategory(name) {
  const category = normalizeCategoryName(name);
  if (!category) return false;

  const db = await read();
  db.categories = (Array.isArray(db.categories) ? db.categories : [])
    .filter((item) => item.toLowerCase() !== category.toLowerCase());

  const timestamp = now();
  for (const product of db.products || []) {
    if (normalizeCategoryName(product.category).toLowerCase() === category.toLowerCase()) {
      product.category = "";
      product.updatedAt = timestamp;
    }
  }

  await write(db);
  return true;
}

async function getAdminSummary() {
  const db = await read();
  const products = db.products || [];
  const orders = db.orders || [];
  const users = db.users || [];
  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const activeProducts = products.filter((product) => product.status === "active").length;
  const lowStock = products.filter((product) => {
    const quantity = Number(product.inventory?.quantity || 0);
    return quantity > 0 && quantity < 5;
  }).length;

  return {
    products: products.length,
    activeProducts,
    orders: orders.length,
    customers: users.filter((user) => user.role === "customer").length,
    revenue: Number(revenue.toFixed(2)),
    lowStock
  };
}

async function listAdminProducts() {
  const db = await read();
  return (db.products || []).sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
}

async function listAdminUsers() {
  const db = await read();
  const products = db.products || [];
  const orders = db.orders || [];

  function productById(id) {
    return products.find((product) => String(product._id) === String(id));
  }

  return (db.users || [])
    .map((user) => {
      const cartItems = (user.cart || [])
        .map((item) => {
          const product = productById(item.product);
          if (!product) return null;
          return {
            quantity: Number(item.quantity || 0),
            product: summarizeProduct(product),
            lineTotal: Number((Number(product.price || 0) * Number(item.quantity || 0)).toFixed(2))
          };
        })
        .filter(Boolean);
      const wishlistItems = (user.wishlist || [])
        .map(productById)
        .filter(Boolean)
        .map(summarizeProduct);
      const userOrders = orders
        .filter((order) => String(order.user) === String(user._id))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

      return {
        ...publicUser(user),
        cart: {
          items: cartItems,
          itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
          subtotal: Number(cartItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2))
        },
        wishlist: {
          items: wishlistItems,
          total: wishlistItems.length
        },
        orders: userOrders,
        totalSpent: Number(userOrders.reduce((sum, order) => sum + Number(order.total || 0), 0).toFixed(2))
      };
    })
    .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
}

async function getSiteSettings() {
  const db = await read();
  return { ...defaultSiteSettings(), ...(db.siteSettings || {}) };
}

async function updateSiteSettings(input) {
  const db = await read();
  db.siteSettings = {
    ...defaultSiteSettings(),
    ...(db.siteSettings || {}),
    ...input,
    updatedAt: now()
  };
  await write(db);
  return db.siteSettings;
}

module.exports = {
  createOrder,
  createProduct,
  createUser,
  deleteCategory,
  deleteProduct,
  emailExists,
  findUserByEmail,
  findUserById,
  findOrCreateSocialUser,
  getProductByHandle,
  getProductsByIds,
  findProduct,
  getUserCart,
  addToCart,
  completeCheckout,
  updateCartItem,
  getUserWishlist,
  toggleWishlist,
  listOrders,
  listBrands,
  listCategories,
  getAdminSummary,
  getSiteSettings,
  listAdminUsers,
  listAdminProducts,
  listProducts,
  publicUser,
  replaceAll,
  createCategory,
  updateSiteSettings,
  updateCategory,
  updateProduct
};
