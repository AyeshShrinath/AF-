const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');

/**
 * Check spending patterns and alert for high spending categories
 */
const checkSpendingPatterns = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id }).sort();
    
    // Group transactions by category and calculate spending
    const spending = {};
    transactions.forEach(transaction => {
      if (transaction.type === 'expense') {
        if (!spending[transaction.category]) {
          spending[transaction.category] = 0;
        }
        spending[transaction.category] += transaction.amount;
      }
    });
    
    // Find high spending categories (above threshold)
    const alerts = [];
    const THRESHOLD = 500;
    
    Object.keys(spending).forEach(category => {
      if (spending[category] > THRESHOLD) {
        alerts.push(`High spending detected in ${category}: $${spending[category]}`);
      }
    });
    
    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error checking spending patterns' });
  }
};

/**
 * Get reminders for upcoming bills in the next 7 days or custom specified days
 */
const upcomingBillReminders = async (req, res) => {
  try {
    const today = new Date();
    // Get daysAhead from query or default to 7
    const daysAhead = req.query.daysAhead ? parseInt(req.query.daysAhead) : 7;
    
    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + daysAhead);
    
    const bills = await Transaction.find({
      user: req.user.id,
      isRecurring: true,
      date: { $gte: today, $lte: nextDate }
    });
    
    const reminders = bills.map(bill => ({
      date: bill.date.toDateString(),
      message: `Upcoming bill: ${bill.category} - $${bill.amount}`
    }));
    
    res.json({ reminders });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error fetching bill reminders' });
  }
};

/**
 * Get reminders for upcoming goals based on threshold days
 */
const upcomingGoalReminders = async (req, res) => {
  try {
    const today = new Date();
    // Get threshold from query or default to 30
    const threshold = req.query.threshold ? parseInt(req.query.threshold) : 30;
    
    // Calculate the threshold date
    const thresholdDate = new Date(today);
    thresholdDate.setDate(thresholdDate.getDate() + threshold);
    
    const goals = await Goal.find({
      user: req.user.id,
      deadline: { $gte: today, $lte: thresholdDate }
    });
    
    const reminders = goals.map(goal => {
      const progress = (goal.savedAmount / goal.targetAmount) * 100;
      return {
        date: goal.deadline.toDateString(),
        message: `Goal "${goal.title}": $${goal.savedAmount} of $${goal.targetAmount} (${progress.toFixed(0)}%)`
      };
    });
    
    res.json({ reminders });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error fetching goal reminders' });
  }
};

module.exports = { checkSpendingPatterns,upcomingBillReminders, upcomingGoalReminders};
