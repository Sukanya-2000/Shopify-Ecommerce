const app = require("./app");
const connectDatabase = require("./config/database");
const { port } = require("./config/env");

connectDatabase().then(() => {
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
});
