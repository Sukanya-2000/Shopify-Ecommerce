const app = require("../src/app");
const connectDatabase = require("../src/config/database");

let ready;

module.exports = async (req, res) => {
  ready ||= connectDatabase();
  await ready;
  return app(req, res);
};
