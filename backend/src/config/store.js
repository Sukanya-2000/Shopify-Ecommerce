const { dataStore } = require("./env");

function usingJsonStore() {
  return dataStore === "json";
}

module.exports = { usingJsonStore };
