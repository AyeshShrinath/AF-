const Transaction = require("../models/Transaction");
const logger = require("../utils/logger");

// Add a new transaction
const addTransaction = async (req, res) => {
    try {
        const { type, amount, category, description, tags, isRecurring, recurrencePattern, recurrenceEndDate } = req.body;

        if (!type || !amount || !category) {
            return res.status(400).json({ message: "Please provide all required fields" });
        }

        const transaction = new Transaction({
            user: req.user.id,
            type,
            amount,
            category,
            description,
            tags,
            isRecurring,
            recurrencePattern,
            recurrenceEndDate
        });

        await transaction.save();
        logger.info(`New transaction created: ${transaction._id} by user ${req.user._id}`);
        res.status(201).json(transaction);
    } catch (error) {
        logger.error(`Transaction creation failed: ${error.message}`);
        res.status(500).json({ message: error.message });
    }
};

// Get transactions with filtering and sorting
const getTransactions = async (req, res) => {
    try {
        let filters = { user: req.user.id };

        // Filtering options
        if (req.query.type) filters.type = req.query.type;
        if (req.query.category) filters.category = req.query.category;
        if (req.query.tags) filters.tags = { $in: req.query.tags.split(",") };

        // Sorting options
        let sortOption = {};
        if (req.query.sortBy) {
            sortOption[req.query.sortBy] = req.query.order === "desc" ? -1 : 1;
        }

        const transactions = await Transaction.find(filters).sort(sortOption);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a transaction
const updateTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        if (transaction.user.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized" });
        }

        const updatedTransaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true });
        logger.info(`Transaction updated: ${req.params.id} by user ${req.user._id}`);
        res.json(updatedTransaction);
    } catch (error) {
        logger.error(`Transaction update failed: ${error.message}`);
        res.status(500).json({ message: error.message });
    }
};

// Delete a transaction
const deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        if (transaction.user.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized" });
        }

        await Transaction.deleteOne({ _id: req.params.id });
        logger.info(`Transaction deleted: ${req.params.id} by user ${req.user._id}`);
        res.json({ message: "Transaction removed" });
    } catch (error) {
        logger.error(`Transaction deletion failed: ${error.message}`);
        res.status(500).json({ message: error.message });
    }
};

// Get upcoming recurring transactions
const getUpcomingRecurringTransactions = async (req, res) => {
    try {
        const today = new Date();
        const upcomingTransactions = await Transaction.find({
            user: req.user.id,
            isRecurring: true,
            recurrenceEndDate: { $gte: today }
        }).sort({ date: 1 });

        res.json(upcomingTransactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get notifications for upcoming and missed recurring transactions
const getRecurringTransactionNotifications = async (req, res) => {
    try {
        const today = new Date();
        const upcomingDaysThreshold = parseInt(req.query.upcomingDays) || 7; // Default 7 days for upcoming
        
        // Set the date range for upcoming transactions
        const upcomingDate = new Date(today);
        upcomingDate.setDate(today.getDate() + upcomingDaysThreshold);
        
        // Find upcoming transactions due within the threshold
        const upcomingTransactions = await Transaction.find({
            user: req.user.id,
            isRecurring: true,
            date: { $gte: today, $lte: upcomingDate }
        }).sort({ date: 1 });
        
        // Find missed transactions (recurring transactions with a date in the past)
        const missedTransactions = await Transaction.find({
            user: req.user.id,
            isRecurring: true,
            date: { $lt: today },
            recurrenceEndDate: { $gte: today } // Only include active recurring transactions
        }).sort({ date: 1 });
        
        res.json({
            upcoming: upcomingTransactions,
            missed: missedTransactions,
            message: `Found ${upcomingTransactions.length} upcoming and ${missedTransactions.length} missed recurring transactions`
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { addTransaction, getTransactions, updateTransaction, deleteTransaction, getUpcomingRecurringTransactions, getRecurringTransactionNotifications};
