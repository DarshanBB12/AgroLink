const Seed = require("../models/Seed");
const { makeController } = require("./productController");

module.exports = makeController("seed", Seed);
