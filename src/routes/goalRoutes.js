const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { addGoal, getGoals, updateGoal, deleteGoal, autoAllocateSavings, getGoalStatistics } = require("../controllers/goalController");

const router = express.Router();
 

router.post("/", protect, addGoal);


router.get("/", protect, getGoals);


router.put("/:id", protect, updateGoal);


router.delete("/:id", protect, deleteGoal);


router.post("/auto_allocate", protect, autoAllocateSavings);


router.get("/stats", protect, getGoalStatistics);

module.exports = router;