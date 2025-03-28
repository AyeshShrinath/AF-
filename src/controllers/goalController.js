const Goal = require("../models/Goal");
const Transaction = require("../models/Transaction");

// Add a new financial goal
const addGoal = async (req, res) => {
    try {
        const { title, targetAmount, deadline, autoAllocate, category, priority, allocationPercentage } = req.body;

        if (!title || !targetAmount || !deadline || !category) {
            return res.status(400).json({ message: "Please provide all required fields" });
        }

        const goal = new Goal({
            user: req.user.id,
            title,
            targetAmount,
            deadline,
            autoAllocate,
            category,
            priority: priority || 1,
            allocationPercentage: allocationPercentage || 10
        });

        await goal.save();
        res.status(201).json(goal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all financial goals for a user
const getGoals = async (req, res) => {
    try {
        const goals = await Goal.find({ user: req.user.id }).sort({ priority: 1, deadline: 1 });
        res.json(goals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update goal progress (manually adding savings)
const updateGoal = async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);

        if (!goal) {
            return res.status(404).json({ message: "Goal not found" });
        }

        if (goal.user.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized" });
        }

        const updatedGoal = await Goal.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedGoal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete a financial goal
const deleteGoal = async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);

        if (!goal) {
            return res.status(404).json({ message: "Goal not found" });
        }

        if (goal.user.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized" });
        }

        await Goal.deleteOne({ _id: req.params.id });
        res.json({ message: "Goal removed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Automatically allocate savings from income
const autoAllocateSavings = async (req, res) => {
    try {
        const goals = await Goal.find({ user: req.user.id, autoAllocate: true }).sort({ priority: 1 });
        
        if (goals.length === 0) {
            return res.status(404).json({ message: "No goals with auto-allocation enabled" });
        }

        const incomeTransactions = await Transaction.find({
            user: req.user.id,
            type: "income"
        });

        const totalIncome = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        
        // Track allocation for each goal
        const allocations = [];

        for (let goal of goals) {
            // Use individual goal's allocation percentage
            const allocationPercent = goal.allocationPercentage || 10;
            const allocationAmount = totalIncome * (allocationPercent / 100);
            
            // Cap the allocation to not exceed the target amount
            const remainingNeeded = goal.targetAmount - goal.savedAmount;
            const actualAllocation = Math.min(allocationAmount, remainingNeeded);
            
            if (actualAllocation > 0) {
                goal.savedAmount += actualAllocation;
                await goal.save();
                
                allocations.push({
                    goalId: goal._id,
                    goalTitle: goal.title,
                    amount: actualAllocation,
                    newProgress: goal.progress
                });
            }
        }

        res.json({ 
            message: "Savings automatically allocated to goals.",
            totalAllocated: allocations.reduce((sum, a) => sum + a.amount, 0),
            allocations
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get goal statistics for visualization
const getGoalStatistics = async (req, res) => {
    try {
        const goals = await Goal.find({ user: req.user.id });
        
        // Overall statistics
        const totalSaved = goals.reduce((sum, goal) => sum + goal.savedAmount, 0);
        const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
        const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
        
        // Category distribution
        const categoryStats = {};
        goals.forEach(goal => {
            if (!categoryStats[goal.category]) {
                categoryStats[goal.category] = {
                    count: 0,
                    saved: 0,
                    target: 0
                };
            }
            categoryStats[goal.category].count += 1;
            categoryStats[goal.category].saved += goal.savedAmount;
            categoryStats[goal.category].target += goal.targetAmount;
        });
        
        // Progress over time (simplified - could be enhanced with actual tracking)
        const upcomingDeadlines = goals
            .filter(g => g.progress < 100 && g.daysRemaining > 0)
            .sort((a, b) => a.deadline - b.deadline)
            .slice(0, 5)
            .map(g => ({
                id: g._id,
                title: g.title, 
                daysRemaining: g.daysRemaining,
                progress: g.progress
            }));
            
        res.json({
            overallProgress,
            totalSaved,
            totalTarget,
            totalGoals: goals.length,
            completedGoals: goals.filter(g => g.progress >= 100).length,
            categoryDistribution: categoryStats,
            upcomingDeadlines
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { addGoal, getGoals, updateGoal, deleteGoal,autoAllocateSavings,getGoalStatistics };

