const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const required = ["MONGODB_URI", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  dataStore: process.env.DATA_STORE || "json",
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  clientOrigin: process.env.CLIENT_ORIGIN || "*",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/auth/social/google/callback",
  microsoftClientId: process.env.MICROSOFT_CLIENT_ID || "",
  microsoftRedirectUri: process.env.MICROSOFT_REDIRECT_URI || "http://localhost:5000/api/auth/social/microsoft/callback"
};
