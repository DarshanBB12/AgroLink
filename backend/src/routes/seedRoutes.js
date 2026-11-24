const express = require("express");
const c = require("../controllers/seedController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, c.list);
router.get("/mine", protect, authorize("equipment_owner", "admin"), c.mine);
router.post("/", protect, authorize("equipment_owner", "admin"), c.create);
router.get("/:id", protect, c.getOne);
router.put("/:id", protect, authorize("equipment_owner", "admin"), c.update);
router.delete("/:id", protect, authorize("equipment_owner", "admin"), c.remove);

module.exports = router;
