const Transaction = require("../models/Transaction");

// Generate spending trends report
const getSpendingTrends = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id }).sort({ date: 1 });

        let trends = {};

        transactions.forEach((transaction) => {
            let month = transaction.date.toISOString().slice(0, 7); // YYYY-MM format

            if (!trends[month]) {
                trends[month] = { income: 0, expense: 0 };
            }

            if (transaction.type === "income") {
                trends[month].income += transaction.amount;
            } else {
                trends[month].expense += transaction.amount;
            }
        });

        res.json(trends);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get visualization data for income vs expenses
const getVisualizationData = async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;
        let filters = { user: req.user.id };
        
        // Add date filters based on period or custom range
        if (startDate && endDate) {
            filters.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        } else if (period === 'month') {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            filters.date = { $gte: firstDay, $lte: lastDay };
        } else if (period === 'year') {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), 0, 1);
            const lastDay = new Date(now.getFullYear(), 11, 31);
            filters.date = { $gte: firstDay, $lte: lastDay };
        }
        
        const transactions = await Transaction.find(filters).sort({ date: 1 });
        
        // Calculate totals
        let totalIncome = 0;
        let totalExpenses = 0;
        const categorySummary = { income: {}, expense: {} };
        const monthlyData = {};
        
        transactions.forEach((transaction) => {
            // Add to totals
            if (transaction.type === "income") {
                totalIncome += transaction.amount;
                
                // Add to category summary
                if (!categorySummary.income[transaction.category]) {
                    categorySummary.income[transaction.category] = 0;
                }
                categorySummary.income[transaction.category] += transaction.amount;
            } else {
                totalExpenses += transaction.amount;
                
                // Add to category summary
                if (!categorySummary.expense[transaction.category]) {
                    categorySummary.expense[transaction.category] = 0;
                }
                categorySummary.expense[transaction.category] += transaction.amount;
            }
            
            // Add to monthly data
            const month = transaction.date.toISOString().slice(0, 7);
            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, expense: 0 };
            }
            if (transaction.type === "income") {
                monthlyData[month].income += transaction.amount;
            } else {
                monthlyData[month].expense += transaction.amount;
            }
        });
        
        res.json({
            totalIncome,
            totalExpenses,
            balance: totalIncome - totalExpenses,
            categorySummary,
            monthlyData,
            period: period || (startDate && endDate ? 'custom' : 'all')
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get filtered financial reports
const getFilteredReport = async (req, res) => {
    try {
        const { startDate, endDate, category, tags, type, minAmount, maxAmount } = req.query;
        let filters = { user: req.user.id };

        if (startDate && endDate) {
            filters.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        if (category) {
            filters.category = category;
        }

        if (tags) {
            filters.tags = { $in: tags.split(",") };
        }
        
        if (type) {
            filters.type = type;
        }
        
        if (minAmount || maxAmount) {
            filters.amount = {};
            if (minAmount) filters.amount.$gte = Number(minAmount);
            if (maxAmount) filters.amount.$lte = Number(maxAmount);
        }

        const transactions = await Transaction.find(filters).sort({ date: -1 });

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {  getSpendingTrends, getFilteredReport,getVisualizationData };