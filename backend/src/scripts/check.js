const fs = require("fs");
const path = require("path");

const requiredModules = ["express", "mongoose", "dotenv", "cors", "helmet", "morgan", "bcryptjs", "jsonwebtoken"];
const missing = requiredModules.filter((moduleName) => {
  try {
    require.resolve(moduleName);
    return false;
  } catch {
    return true;
  }
});

const envPath = path.resolve(__dirname, "../../.env");
const hasEnv = fs.existsSync(envPath);
const env = hasEnv ? fs.readFileSync(envPath, "utf8") : "";
const hasMongoUri = /^MONGODB_URI=.+/m.test(env);
const hasJwtSecret = /^JWT_SECRET=.+/m.test(env);

if (missing.length) {
  console.error(`Missing dependencies: ${missing.join(", ")}`);
  console.error("Run `npm install` from the backend directory.");
  process.exit(1);
}

if (!hasMongoUri) {
  console.error("Missing MONGODB_URI in backend/.env");
  process.exit(1);
}

if (!hasJwtSecret) {
  console.error("Missing JWT_SECRET in backend/.env");
  process.exit(1);
}

console.log("Backend dependencies and environment file look ready.");
