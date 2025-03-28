const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {addTransaction,getTransactions,updateTransaction, deleteTransaction, getUpcomingRecurringTransactions, getRecurringTransactionNotifications} = require("../controllers/transactionController");

const router = express.Router();


router.post("/", protect, addTransaction);

router.get("/", protect, getTransactions);

router.put("/:id", protect, updateTransaction);

router.delete("/:id", protect, deleteTransaction);

router.get("/recurring", protect, getUpcomingRecurringTransactions);

router.get("/notifications", protect, getRecurringTransactionNotifications);

module.exports = router;