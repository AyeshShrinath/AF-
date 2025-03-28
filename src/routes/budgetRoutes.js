const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { addBudget, getBudgets, updateBudget, deleteBudget, checkBudgetStatus, getBudgetRecommendations } = require("../controllers/budgetController");

const router = express.Router();


router.post("/", protect, addBudget);


router.get("/", protect, getBudgets);


router.put("/:id", protect, updateBudget);


router.delete("/:id", protect, deleteBudget);


router.get("/status", protect, checkBudgetStatus);


router.get("/recommendations", protect, getBudgetRecommendations);

module.exports = router;