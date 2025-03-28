const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');

// Helper function to check if we're in test environment
const isTestEnv = () => process.env.NODE_ENV === 'test';

// Controller for getting admin dashboard data
exports.getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const totalBudgets = await Budget.countDocuments();
    const totalGoals = await Goal.countDocuments();

    res.json({
      totalUsers,
      totalTransactions,
      totalBudgets,
      totalGoals
    });
  } catch (error) {
    if (!isTestEnv()) console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching admin dashboard data' });
  }
};

// Controller for getting user dashboard data
exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!isTestEnv()) console.log(`Processing dashboard for user ID: ${userId}`);

    // Get income transactions
    const incomeAggregate = await Transaction.aggregate([
      { $match: { user: userId, type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // Get expense transactions
    const expenseAggregate = await Transaction.aggregate([
      { $match: { user: userId, type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Extract values directly from the aggregate results
    const totalIncome = incomeAggregate.length > 0 ? incomeAggregate[0].total : 0;
    const totalExpense = expenseAggregate.length > 0 ? expenseAggregate[0].total : 0;
    const balance = totalIncome - totalExpense;

    // Get budgets and goals
    const budgets = await Budget.find({ user: userId });
    const goals = await Goal.find({ user: userId });

    res.json({
      totalIncome,
      totalExpense,
      balance,
      budgets,
      goals
    });
  } catch (error) {
    if (!isTestEnv()) {
      console.error('User dashboard error:', error.message);
      console.error('Stack trace:', error.stack);
    }
    res.status(500).json({ message: 'Server error fetching user dashboard data', error: error.message });
  }
};
