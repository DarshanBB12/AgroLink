const express = require("express");
const { getHowItWorks } = require("../controllers/systemController");

const router = express.Router();
router.get("/how-it-works", getHowItWorks);
module.exports = router;
