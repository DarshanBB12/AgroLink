const express = require("express");
const { search, suggest } = require("../controllers/searchController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/suggestions", protect, suggest);
router.get("/", protect, search);

module.exports = router;
