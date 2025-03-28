const express = require("express");
const { protect ,admin} = require("../middleware/authMiddleware");
const { getAdminDashboard, getUserDashboard } = require("../controllers/dashboardController");

const router = express.Router();


router.get("/admin", protect,admin, getAdminDashboard);
router.get("/user", protect, getUserDashboard);

module.exports = router;