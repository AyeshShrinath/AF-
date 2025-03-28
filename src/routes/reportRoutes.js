const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getSpendingTrends, getFilteredReport, getVisualizationData } = require("../controllers/reportController");

const router = express.Router();


router.get("/trends", protect, getSpendingTrends);

router.get("/filter", protect, getFilteredReport);

router.get("/visual", protect, getVisualizationData);


module.exports = router;