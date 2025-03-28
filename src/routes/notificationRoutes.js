const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { 
  checkSpendingPatterns, 
  upcomingBillReminders,
  upcomingGoalReminders 
} = require("../controllers/notificationController");

const router = express.Router();


router.get("/spending_alerts", protect, checkSpendingPatterns);

router.get("/bill_reminders", protect, upcomingBillReminders);

router.get("/goal_reminders", protect, upcomingGoalReminders);

module.exports = router;