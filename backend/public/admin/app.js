const state = { token: localStorage.getItem("cybernestAdminToken"), products: [], users: [], categories: [], settings: null, selectedUserId: null, selectedCategoryName: "" };
const $ = (selector) => document.querySelector(selector);
const exchangeRates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
  INR: 83,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 157,
  CNY: 7.25,
  SGD: 1.35,
  AED: 3.67,
  SAR: 3.75,
  CHF: 0.9,
  SEK: 10.45,
  NOK: 10.65,
  DKK: 6.86,
  NZD: 1.66,
  HKD: 7.81,
  KRW: 1380,
  BRL: 5.45,
  MXN: 18.1,
  ZAR: 18.2,
  TRY: 33,
  MYR: 4.7,
  THB: 36.7,
  PHP: 58.5,
  IDR: 16250,
  VND: 25400,
  PLN: 3.95,
  CZK: 23.2,
  HUF: 364,
  ILS: 3.7
};
const api = async (path, options = {}) => {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}), ...(options.headers || {}) }
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Request failed");
  return res.status === 204 ? null : res.json();
};
const currencyCodes = () => {
  if (Intl.supportedValuesOf) return Intl.supportedValuesOf("currency");
  return ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY", "CNY", "SGD", "AED"];
};
const money = (value) => {
  const settings = state.settings || {};
  const currency = settings.currency || "USD";
  const rate = Number(exchangeRates[currency] || settings.currencyRate || 1);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Number(value || 0) * rate);
};
const setMessage = (id, text) => { $(id).textContent = text; setTimeout(() => { $(id).textContent = ""; }, 3000); };
const escapeHtml = (value) => {
  const element = document.createElement("span");
  element.textContent = value || "";
  return element.innerHTML;
};

function showApp(active) {
  $("#loginPanel").classList.toggle("hidden", active);
  $("#appPanel").classList.toggle("hidden", !active);
  $("#logoutButton").style.visibility = active ? "visible" : "hidden";
  $("#topLogoutButton").hidden = !active;
}

function switchView(view) {
  document.querySelectorAll(".view").forEach((node) => node.classList.add("hidden"));
  $(`#${view}View`).classList.remove("hidden");
  document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $("#pageTitle").textContent = view[0].toUpperCase() + view.slice(1);
}

async function loadAll() {
  const [summary, products, users, categories, settings] = await Promise.all([
    api("/api/admin/summary"),
    api("/api/admin/products"),
    api("/api/admin/users"),
    api("/api/categories"),
    api("/api/admin/settings")
  ]);
  state.products = products.items;
  state.users = users.items;
  state.categories = categories.items || [];
  if (!state.selectedUserId && state.users[0]) state.selectedUserId = state.users[0]._id;
  state.settings = settings;
  renderSummary(summary);
  renderCategoryOptions();
  renderProducts();
  renderCategories();
  renderUsers();
  fillSettings(settings);
  $("#connectionStatus").textContent = "API connected";
}

function renderSummary(summary) {
  const metrics = [["Products", summary.products], ["Active", summary.activeProducts], ["Orders", summary.orders], ["Customers", summary.customers], ["Revenue", money(summary.revenue)], ["Low Stock", summary.lowStock]];
  $("#metricGrid").innerHTML = metrics.map(([label, value]) => `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`).join("");
  $("#recentProducts").innerHTML = state.products.slice(0, 8).map(productRow).join("");
}

function productRow(product) {
  const quantity = Number(product.inventory?.quantity || 0);
  const stockClass = quantity <= 0 ? "stock-pill stock-pill--out" : quantity < 5 ? "stock-pill stock-pill--low" : "stock-pill";
  const stockText = quantity <= 0 ? "Out of stock" : `${quantity} pcs`;
  return `<article class="product-row" data-handle="${product.handle}"><img src="${product.image?.src || ""}" alt=""><span><strong>${product.title}</strong><small>${product.sku || product.handle} - ${product.type || "Uncategorized"}</small><span class="${stockClass}">${stockText}</span></span><span class="price">${money(product.price)}</span><span class="row-actions"><button type="button" class="row-action" data-product-edit="${product.handle}">Edit</button><button type="button" class="row-action row-action--danger" data-product-delete="${product.handle}">Delete</button></span></article>`;
}

function renderProducts() {
  const term = $("#productSearch").value.trim().toLowerCase();
  const items = state.products.filter((product) => !term || [product.title, product.sku, product.type, product.handle].join(" ").toLowerCase().includes(term));
  $("#productList").innerHTML = items.map(productRow).join("");
}

function renderCategoryOptions(selectedCategory = "") {
  const select = $("[data-category-select]");
  if (!select) return;
  const categoryNames = [...new Set([
    ...state.categories.map((category) => category.name || category),
    ...state.products.map((product) => product.category).filter(Boolean),
    selectedCategory
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b));
  select.innerHTML = '<option value="">Uncategorized</option>' + categoryNames
    .map((name) => `<option value="${escapeHtml(name)}" ${name === selectedCategory ? "selected" : ""}>${escapeHtml(name)}</option>`)
    .join("");
}

function categoryProductCount(name) {
  return state.products.filter((product) => product.category === name).length;
}

function categoryRow(category) {
  const name = category.name || category;
  const active = state.selectedCategoryName === name ? " active" : "";
  const count = categoryProductCount(name);
  return `<article class="category-row${active}" data-category-name="${encodeURIComponent(name)}"><span><strong>${escapeHtml(name)}</strong><small>${count} product${count === 1 ? "" : "s"}</small></span><span class="stock-pill">${count}</span><span class="row-actions"><button type="button" class="row-action" data-category-edit="${encodeURIComponent(name)}">Edit</button><button type="button" class="row-action row-action--danger" data-category-delete="${encodeURIComponent(name)}">Delete</button></span></article>`;
}

function renderCategories() {
  const list = $("#categoryList");
  if (!list) return;
  const search = $("#categorySearch");
  const term = search ? search.value.trim().toLowerCase() : "";
  const categories = state.categories.filter((category) => {
    const name = category.name || category;
    return !term || name.toLowerCase().includes(term);
  });
  list.innerHTML = categories.length ? categories.map(categoryRow).join("") : '<p class="empty-note">No categories found.</p>';
}

function fillCategory(category = {}) {
  const form = $("#categoryForm");
  const name = category.name || "";
  form.originalName.value = name;
  form.name.value = name;
  state.selectedCategoryName = name;
  $("#categoryFormTitle").textContent = name ? "Edit Category" : "Add Category";
  renderCategories();
}

function userRow(user) {
  return `<button class="user-row ${state.selectedUserId === user._id ? "active" : ""}" data-user-id="${user._id}"><span><strong>${user.name || "Unnamed user"}</strong><small>${user.email} - ${user.role}</small></span><span><b>${user.wishlist?.total || 0}</b> wishlist<br><b>${user.cart?.itemCount || 0}</b> cart</span></button>`;
}

function compactProductList(items, emptyText) {
  if (!items?.length) return `<p class="empty-note">${emptyText}</p>`;
  return `<div class="mini-list">${items.map((item) => {
    const product = item.product || item;
    const quantity = item.quantity ? ` x ${item.quantity}` : "";
    return `<div class="mini-item"><img src="${product.image?.src || ""}" alt=""><span><strong>${product.title}</strong><small>${money(product.price || item.lineTotal || 0)}${quantity}</small></span></div>`;
  }).join("")}</div>`;
}

function renderUserDetail() {
  const user = state.users.find((item) => item._id === state.selectedUserId) || state.users[0];
  if (!user) { $("#userDetail").innerHTML = "<p>No users found.</p>"; return; }
  state.selectedUserId = user._id;
  $("#userDetail").innerHTML = `<div class="user-heading"><div><p class="eyebrow">${user.role}</p><h2>${user.name || "Unnamed user"}</h2><p>${user.email}</p></div><strong>${money(user.totalSpent || 0)}</strong></div><div class="detail-metrics"><span><b>${user.orders?.length || 0}</b> orders</span><span><b>${user.cart?.itemCount || 0}</b> cart items</span><span><b>${user.wishlist?.total || 0}</b> wishlist</span></div><h3>Wishlist</h3>${compactProductList(user.wishlist?.items, "No wishlist items.")}<h3>Cart</h3>${compactProductList(user.cart?.items, "Cart is empty.")}<h3>Orders</h3>${user.orders?.length ? `<div class="order-list">${user.orders.map((order) => `<article class="order-row"><span><strong>Order ${String(order._id).slice(-6).toUpperCase()}</strong><small>${new Date(order.createdAt).toLocaleDateString()} - ${order.status}</small></span><b>${money(order.total)}</b></article>`).join("")}</div>` : `<p class="empty-note">No orders yet.</p>`}`;
}

function renderUsers() {
  const search = $("#userSearch");
  if (!search) return;
  const term = search.value.trim().toLowerCase();
  const users = state.users.filter((user) => !term || [user.name, user.email, user.role].join(" ").toLowerCase().includes(term));
  $("#userList").innerHTML = users.map(userRow).join("");
  renderUserDetail();
}

function fillProduct(product = {}) {
  const form = $("#productForm");
  form.originalHandle.value = product.handle || "";
  form.title.value = product.title || "";
  form.handle.value = product.handle || "";
  form.sku.value = product.sku || "";
  form.status.value = product.status || "active";
  form.price.value = product.price || "";
  form.compareAtPrice.value = product.compareAtPrice || "";
  form.quantity.value = product.inventory?.quantity ?? 0;
  form.type.value = product.type || "";
  form.vendor.value = product.vendor || "CyberNest";
  renderCategoryOptions(product.category || "");
  form.category.value = product.category || "";
  form.tags.value = (product.tags || []).join(", ");
  form.imageUrl.value = product.image?.src || "";
  form.descriptionHtml.value = product.descriptionHtml || "";
  $("#productFormTitle").textContent = product.handle ? "Edit Product" : "Add Product";
}

function updateQuantityPreview() {
  const input = $("[data-quantity-input]");
  const preview = $("#quantityPreview");
  if (!input || !preview) return;
  const quantity = Math.max(0, Math.floor(Number(input.value || 0)));
  preview.textContent = quantity === 1 ? "1 pc" : `${quantity} pcs`;
  preview.className = quantity <= 0 ? "field-note field-note--out" : quantity < 5 ? "field-note field-note--low" : "field-note";
}
function productPayload(form) {
  const quantity = Math.max(0, Math.floor(Number(form.quantity.value || 0)));
  return { title: form.title.value, handle: form.handle.value, sku: form.sku.value, status: form.status.value, price: form.price.value, compareAtPrice: form.compareAtPrice.value, inventory: { quantity }, type: form.type.value, vendor: form.vendor.value, category: form.category.value, tags: form.tags.value, imageUrl: form.imageUrl.value, descriptionHtml: form.descriptionHtml.value };
}

function fillCurrencyOptions(selectedCurrency = "USD") {
  const select = $("[data-currency-select]");
  if (!select || select.options.length) return;
  select.innerHTML = currencyCodes()
    .map((code) => `<option value="${code}" ${code === selectedCurrency ? "selected" : ""}>${code}</option>`)
    .join("");
}

function fillSettings(settings) {
  const form = $("#settingsForm");
  fillCurrencyOptions(settings.currency || "USD");
  Object.keys(settings).forEach((key) => { if (form[key]) form[key].value = settings[key] || ""; });
  renderThemePreview();
}

function renderThemePreview() {
  const s = state.settings || {};
  const preview = $("#themePreview");
  const radius = `${Number(s.cornerRadius ?? 8)}px`;
  const overlay = s.contrastMode === "high" ? ".96" : s.contrastMode === "soft" ? ".68" : ".84";
  preview.style.background = s.backgroundColor;
  preview.style.color = s.textColor;
  preview.style.borderColor = s.borderColor;
  preview.style.borderRadius = radius;
  preview.querySelector(".announcement").textContent = s.announcement || "";
  preview.querySelector(".announcement").style.background = s.headerBackgroundColor || s.primaryColor;
  preview.querySelector(".announcement").style.color = s.headerTextColor || "#fff";
  preview.querySelector(".preview-hero").style.backgroundImage = `linear-gradient(90deg, ${s.surfaceColor || "#fff"} 0%, rgba(255,255,255,${overlay}) 48%, rgba(255,255,255,.08)), url("${s.heroImageUrl || ""}")`;
  preview.querySelector(".preview-tagline").textContent = s.tagline || "";
  preview.querySelector(".preview-tagline").style.color = s.secondaryColor || s.primaryColor;
  preview.querySelector("h2").textContent = s.heroTitle || "";
  preview.querySelector(".preview-subtitle").textContent = s.heroSubtitle || "";
  preview.querySelector(".preview-subtitle").style.color = s.mutedColor || s.textColor;
  preview.querySelector("button").textContent = s.buttonLabel || "Shop now";
  preview.querySelector("button").style.background = s.accentColor;
  preview.querySelector("button").style.color = s.buttonTextColor || "white";
  preview.querySelector("button").style.borderRadius = radius;
}

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify(body) });
    state.token = data.token;
    localStorage.setItem("cybernestAdminToken", state.token);
    showApp(true);
    await loadAll();
  } catch (error) { $("#loginMessage").textContent = error.message; }
});

function logout() {
  localStorage.removeItem("cybernestAdminToken");
  state.token = null;
  showApp(false);
  $("#connectionStatus").textContent = "Logged out";
}

$("#logoutButton").addEventListener("click", logout);
$("#topLogoutButton").addEventListener("click", logout);
document.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
$("#productSearch").addEventListener("input", renderProducts);
$("#categorySearch").addEventListener("input", renderCategories);
$("#userSearch").addEventListener("input", renderUsers);
$("#newProductButton").addEventListener("click", () => fillProduct());
$("#newCategoryButton").addEventListener("click", () => fillCategory());

document.body.addEventListener("click", (event) => {
  const productEdit = event.target.closest("[data-product-edit]");
  if (productEdit) {
    const product = state.products.find((item) => item.handle === productEdit.dataset.productEdit);
    if (product) { fillProduct(product); switchView("products"); }
    return;
  }

  const productDelete = event.target.closest("[data-product-delete]");
  if (productDelete) {
    const handle = productDelete.dataset.productDelete;
    const product = state.products.find((item) => item.handle === handle);
    if (!handle || !confirm(`Delete ${product?.title || "this product"}?`)) return;
    api(`/api/admin/products/${handle}`, { method: "DELETE" }).then(async () => {
      fillProduct();
      setMessage("#productMessage", "Product deleted");
      await loadAll();
    });
    return;
  }

  const categoryEdit = event.target.closest("[data-category-edit]");
  if (categoryEdit) {
    fillCategory({ name: decodeURIComponent(categoryEdit.dataset.categoryEdit) });
    switchView("categories");
    return;
  }

  const categoryDelete = event.target.closest("[data-category-delete]");
  if (categoryDelete) {
    const name = decodeURIComponent(categoryDelete.dataset.categoryDelete);
    if (!name || !confirm("Delete this category? Products in this category will become uncategorized.")) return;
    api(`/api/categories/${encodeURIComponent(name)}`, { method: "DELETE" }).then(async () => {
      fillCategory();
      setMessage("#categoryMessage", "Category deleted");
      await loadAll();
    });
    return;
  }
  const productRowNode = event.target.closest(".product-row");
  if (productRowNode) {
    const product = state.products.find((item) => item.handle === productRowNode.dataset.handle);
    if (product) { fillProduct(product); switchView("products"); }
    return;
  }
  const userRowNode = event.target.closest(".user-row");
  if (userRowNode) { state.selectedUserId = userRowNode.dataset.userId; renderUsers(); }
  const categoryRowNode = event.target.closest(".category-row");
  if (categoryRowNode) {
    fillCategory({ name: decodeURIComponent(categoryRowNode.dataset.categoryName) });
    return;
  }
});

$("#productForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const handle = form.originalHandle.value;
  await api(handle ? `/api/admin/products/${handle}` : "/api/admin/products", { method: handle ? "PUT" : "POST", body: JSON.stringify(productPayload(form)) });
  setMessage("#productMessage", "Product saved");
  await loadAll();
});


$("#categoryForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const originalName = form.originalName.value;
  const name = form.name.value.trim();
  if (!name) return;
  const category = await api(originalName ? `/api/categories/${encodeURIComponent(originalName)}` : "/api/categories", {
    method: originalName ? "PUT" : "POST",
    body: JSON.stringify({ name })
  });
  state.selectedCategoryName = category.name;
  setMessage("#categoryMessage", "Category saved");
  await loadAll();
  fillCategory(category);
});


$("#settingsForm").addEventListener("input", (event) => { state.settings = { ...state.settings, ...Object.fromEntries(new FormData(event.currentTarget)) }; renderThemePreview(); renderSummary({ products: state.products.length, activeProducts: state.products.filter((product) => product.status === "active").length, orders: state.users.reduce((sum, user) => sum + (user.orders?.length || 0), 0), customers: state.users.filter((user) => user.role === "customer").length, revenue: state.users.reduce((sum, user) => sum + Number(user.totalSpent || 0), 0), lowStock: state.products.filter((product) => { const quantity = Number(product.inventory?.quantity || 0); return quantity > 0 && quantity < 5; }).length }); renderProducts(); renderUsers(); });
$("#settingsForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  state.settings = await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
  fillSettings(state.settings);
  setMessage("#settingsMessage", "Theme settings saved");
});

(async function init() {
  showApp(Boolean(state.token));
  if (!state.token) return;
  try { await loadAll(); } catch (error) { localStorage.removeItem("cybernestAdminToken"); state.token = null; showApp(false); $("#connectionStatus").textContent = "Login required"; }
})();








