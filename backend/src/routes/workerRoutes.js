const express = require("express");
const c = require("../controllers/workerController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, c.list);
router.get("/me", protect, authorize("worker"), c.getMyProfile);
router.put("/me", protect, authorize("worker"), c.upsertMyWorkerProfile);
router.get("/:id", protect, c.getOne);

module.exports = router;
