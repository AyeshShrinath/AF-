const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");

// Add a new budget
const addBudget = async (req, res) => {
    try {
        const { category, amount, period, alertThreshold } = req.body;

        if (!category || !amount || !period) {
            return res.status(400).json({ message: "Please provide all required fields" });
        }

        const budget = new Budget({
            user: req.user.id,
            category,
            amount,
            period,
            alertThreshold
        });

        await budget.save();
        res.status(201).json(budget);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all budgets for a user
const getBudgets = async (req, res) => {
    try {
        const budgets = await Budget.find({ user: req.user.id });
        res.json(budgets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a budget
const updateBudget = async (req, res) => {
    try {
        const budget = await Budget.findById(req.params.id);

        if (!budget) {
            return res.status(404).json({ message: "Budget not found" });
        }

        if (budget.user.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized" });
        }

        const updatedBudget = await Budget.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedBudget);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete a budget
const deleteBudget = async (req, res) => {
    try {
        const budget = await Budget.findById(req.params.id);

        if (!budget) {
            return res.status(404).json({ message: "Budget not found" });
        }

        if (budget.user.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized" });
        }

        await Budget.deleteOne({ _id: req.params.id });
        res.json({ message: "Budget removed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Check if the user is exceeding the budget
const checkBudgetStatus = async (req, res) => {
    try {
        const budgets = await Budget.find({ user: req.user.id });

        for (let budget of budgets) {
            const transactions = await Transaction.find({
                user: req.user.id,
                category: budget.category,
                type: "expense"
            });

            const totalSpent = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
            budget.spent = totalSpent;

            if ((totalSpent / budget.amount) * 100 >= budget.alertThreshold) {
                return res.status(200).json({
                    message: `Alert: You have spent ${Math.round((totalSpent / budget.amount) * 100)}% of your budget for ${budget.category}.`
                });
            }
        }

        res.status(200).json({ message: "All budgets are within limits." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get budget recommendations based on spending trends
const getBudgetRecommendations = async (req, res) => {
    try {
        const budgets = await Budget.find({ user: req.user.id });
        const recommendations = [];

        for (let budget of budgets) {
            // Get transactions for this budget category in the last 3 months
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

            const transactions = await Transaction.find({
                user: req.user.id,
                category: budget.category,
                type: "expense",
                date: { $gte: threeMonthsAgo }
            });

            const totalSpent = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
            const monthlyAverage = totalSpent / 3;
            
            let recommendation = "";
            
            // Calculate spending trend percentage compared to budget
            const percentOfBudget = (monthlyAverage / budget.amount) * 100;
            
            // Generate recommendation based on spending trends
            if (percentOfBudget > 110) {
                recommendation = `Consider increasing your ${budget.category} budget by ${Math.ceil(percentOfBudget - 100)}% based on your 3-month average spending.`;
            } else if (percentOfBudget < 70) {
                recommendation = `You might be able to reduce your ${budget.category} budget by ${Math.floor(100 - percentOfBudget)}% based on your 3-month spending patterns.`;
            } else {
                recommendation = `Your ${budget.category} budget is well-aligned with your spending habits.`;
            }
            
            // Update the budget with recommendations
            await Budget.findByIdAndUpdate(budget._id, { recommendations: recommendation });
            
            recommendations.push({
                category: budget.category,
                recommendation,
                currentBudget: budget.amount,
                averageSpending: monthlyAverage,
                percentOfBudget: Math.round(percentOfBudget)
            });
        }
        
        res.json({ recommendations });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { addBudget, getBudgets, updateBudget, deleteBudget, checkBudgetStatus, getBudgetRecommendations };
