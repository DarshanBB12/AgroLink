const express = require("express");
const c = require("../controllers/equipmentController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, c.list);
router.get("/mine", protect, authorize("equipment_owner", "admin"), c.mine);
router.post("/seed", protect, authorize("admin"), c.seed);
router.post("/", protect, authorize("equipment_owner", "admin"), c.create);
router.get("/:id/availability", protect, c.availability);
router.get("/:id", protect, c.getOne);
router.put("/:id", protect, authorize("equipment_owner", "admin"), c.update);
router.delete("/:id", protect, authorize("equipment_owner", "admin"), c.remove);

module.exports = router;
