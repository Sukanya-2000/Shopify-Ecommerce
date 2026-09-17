const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const connectDatabase = require("../config/database");
const Product = require("../models/Product");
const User = require("../models/User");
const Order = require("../models/Order");
const jsonStore = require("../data/jsonStore");
const { dataStore } = require("../config/env");
const parseCsv = require("./parseCsv");

function toBool(value) {
  return String(value).toLowerCase() === "true";
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const fallbackImagesByType = {
  Audio: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
  "Bags & Cases": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80",
  "Cables": "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=1200&q=80",
  "Camera": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
  "Chargers": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1200&q=80",
  "Computer Accessories": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
  "Creator Gear": "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
  "Desk Gear": "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80",
  "Docks & Hubs": "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=1200&q=80",
  "Gaming": "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1200&q=80",
  "Home Tech": "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1200&q=80",
  "Keyboards": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80",
  "Lighting": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80",
  "Mice": "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1200&q=80",
  "Monitors": "https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=1200&q=80",
  "Networking": "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=1200&q=80",
  "Office Tech": "https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=1200&q=80",
  "Phone Accessories": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80",
  "Power": "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=1200&q=80",
  "Security": "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1200&q=80",
  "Smart Home": "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1200&q=80",
  "Tablet Accessories": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=1200&q=80",
  "Trackers": "https://images.unsplash.com/photo-1581090700227-1e37b190418e?auto=format&fit=crop&w=1200&q=80",
  "Wearables": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80"
};

const sampleBrands = [
  {
    _id: "brand_cybernest",
    name: "CyberNest",
    tagline: "Connected home essentials",
    initials: "CN",
    color: "#0f172a"
  },
  {
    _id: "brand_orbit",
    name: "Orbit",
    tagline: "Networking and charging",
    initials: "OR",
    color: "#0f766e"
  },
  {
    _id: "brand_pulse",
    name: "Pulse",
    tagline: "Audio for every setup",
    initials: "PU",
    color: "#7c3aed"
  },
  {
    _id: "brand_halo",
    name: "Halo",
    tagline: "Lighting and smart scenes",
    initials: "HA",
    color: "#ca8a04"
  },
  {
    _id: "brand_nova",
    name: "Nova",
    tagline: "Gaming desk gear",
    initials: "NV",
    color: "#dc2626"
  },
  {
    _id: "brand_roam",
    name: "Roam",
    tagline: "Travel-ready accessories",
    initials: "RM",
    color: "#2563eb"
  }
];

const sampleSiteSettings = {
  storeName: "CyberNest",
  tagline: "Connected home essentials",
  announcement: "Free shipping on orders over $100",
  supportEmail: "support@cybernest.local",
  currency: "USD",
  primaryColor: "#0f766e",
  accentColor: "#f97316",
  backgroundColor: "#f8fafc",
  textColor: "#111827",
  heroTitle: "Upgrade every corner of your connected home",
  heroSubtitle: "Smart devices, desk gear, and everyday tech curated for modern living.",
  buttonLabel: "Shop new arrivals",
  logoUrl: "",
  heroImageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1600&q=80"
};

function productImage(row) {
  return row["Image Src"] || fallbackImagesByType[row.Type] || "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=80";
}

function mapProduct(row) {
  const timestamp = new Date().toISOString();

  return {
    _id: undefined,
    handle: row.Handle,
    title: row.Title,
    descriptionHtml: row["Body (HTML)"],
    vendor: row.Vendor,
    category: row["Product Category"],
    type: row.Type,
    tags: row.Tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    published: toBool(row.Published),
    option: {
      name: row["Option1 Name"],
      value: row["Option1 Value"]
    },
    sku: row["Variant SKU"],
    grams: toNumber(row["Variant Grams"]),
    inventory: {
      tracker: row["Variant Inventory Tracker"],
      quantity: toNumber(row["Variant Inventory Qty"]),
      policy: row["Variant Inventory Policy"]
    },
    fulfillmentService: row["Variant Fulfillment Service"],
    price: toNumber(row["Variant Price"]),
    compareAtPrice: row["Variant Compare At Price"] ? toNumber(row["Variant Compare At Price"]) : null,
    requiresShipping: toBool(row["Variant Requires Shipping"]),
    taxable: toBool(row["Variant Taxable"]),
    image: {
      src: productImage(row),
      alt: row["Image Alt Text"] || row.Title
    },
    giftCard: toBool(row["Gift Card"]),
    status: row.Status || "active",
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function createId(index) {
  return `dev_${String(index + 1).padStart(5, "0")}`;
}

async function seed() {
  if (dataStore !== "json") {
    await connectDatabase();
  }

  const csvPath = path.resolve(__dirname, "../../../cybernest-theme/data/sample-products.csv");
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const products = rows.map(mapProduct);

  let createdProducts;

  if (dataStore === "json") {
    createdProducts = products.map((product, index) => ({
      ...product,
      _id: createId(index)
    }));
  } else {
    await Promise.all([Product.deleteMany({}), User.deleteMany({}), Order.deleteMany({})]);
    createdProducts = await Product.insertMany(products.map(({ _id, ...product }) => product));
  }

  const passwordHash = await bcrypt.hash("Password123!", 10);
  const adminInput = {
    name: "CyberNest Admin",
    email: "admin@cybernest.local",
    passwordHash,
    role: "admin"
  };

  const customerInput = {
    name: "Sample Customer",
    email: "customer@cybernest.local",
    passwordHash,
    role: "customer"
  };

  const extraCustomerInputs = [
    {
      name: "Jordan Lee",
      email: "jordan.lee@example.com",
      passwordHash,
      role: "customer"
    },
    {
      name: "Priya Shah",
      email: "priya.shah@example.com",
      passwordHash,
      role: "customer"
    }
  ];

  const users =
    dataStore === "json"
      ? [adminInput, customerInput, ...extraCustomerInputs].map((user, index) => ({
          ...user,
          _id: createId(createdProducts.length + index),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }))
      : [
          await User.create(adminInput),
          await User.create(customerInput),
          ...(await User.insertMany(extraCustomerInputs))
        ];

  const customers = users.filter((user) => user.role === "customer");

  function buildOrderItems(offset, quantities) {
    return quantities.map((quantity, index) => {
      const product = createdProducts[offset + index];

      return {
        product: product._id,
        title: product.title,
        sku: product.sku,
        quantity,
        price: product.price
      };
    });
  }

  function totalsFor(items) {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal > 100 ? 0 : 8.99;
    const tax = Number((subtotal * 0.08).toFixed(2));

    return {
      subtotal,
      shipping,
      tax,
      total: Number((subtotal + shipping + tax).toFixed(2))
    };
  }

  const sampleOrders = [
    {
      user: customers[0],
      items: buildOrderItems(0, [1, 2, 1]),
      shippingAddress: {
        line1: "100 Market Street",
        city: "San Francisco",
        state: "CA",
        postalCode: "94105",
        country: "US"
      },
      status: "paid"
    },
    {
      user: customers[1],
      items: buildOrderItems(12, [2, 1]),
      shippingAddress: {
        line1: "221 W Lake Street",
        city: "Chicago",
        state: "IL",
        postalCode: "60606",
        country: "US"
      },
      status: "fulfilled"
    },
    {
      user: customers[2],
      items: buildOrderItems(30, [1, 1, 1]),
      shippingAddress: {
        line1: "88 MG Road",
        city: "Bengaluru",
        state: "KA",
        postalCode: "560001",
        country: "IN"
      },
      status: "pending"
    }
  ];

  const orders = sampleOrders.map((order, index) => ({
      user: order.user._id,
      customer: { name: order.user.name, email: order.user.email },
      items: order.items,
      shippingAddress: order.shippingAddress,
      ...totalsFor(order.items),
      status: order.status,
      _id: dataStore === "json" ? createId(createdProducts.length + users.length + index) : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

  if (dataStore === "json") {
    await jsonStore.replaceAll({ products: createdProducts, users, orders, brands: sampleBrands, siteSettings: sampleSiteSettings });
  } else {
    await Order.insertMany(orders.map(({ _id, ...order }) => order));
  }

  console.log(`Seeded ${createdProducts.length} products, 4 users, and ${sampleOrders.length} orders.`);
  console.log("Admin login: admin@cybernest.local / Password123!");
  console.log("Customer login: customer@cybernest.local / Password123!");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
