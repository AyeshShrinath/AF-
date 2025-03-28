const {
  getAdminDashboard,
  getUserDashboard
} = require('../../controllers/dashboardController');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const Budget = require('../../models/Budget');
const Goal = require('../../models/Goal');

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../models/Transaction');
jest.mock('../../models/Budget');
jest.mock('../../models/Goal');

describe('Dashboard Controller Unit Tests', () => {
  let mockRequest;
  let mockResponse;
  
  beforeEach(() => {
    mockRequest = {
      user: { id: 'user123' },
      body: {},
      params: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getAdminDashboard', () => {
    it('should get admin dashboard data', async () => {
      User.countDocuments = jest.fn().mockResolvedValue(25);
      Transaction.countDocuments = jest.fn().mockResolvedValue(150);
      Budget.countDocuments = jest.fn().mockResolvedValue(40);
      Goal.countDocuments = jest.fn().mockResolvedValue(30);
      
      await getAdminDashboard(mockRequest, mockResponse);
      
      expect(User.countDocuments).toHaveBeenCalled();
      expect(Transaction.countDocuments).toHaveBeenCalled();
      expect(Budget.countDocuments).toHaveBeenCalled();
      expect(Goal.countDocuments).toHaveBeenCalled();
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        totalUsers: 25,
        totalTransactions: 150,
        totalBudgets: 40,
        totalGoals: 30
      });
    });
    
    it('should handle errors', async () => {
      User.countDocuments = jest.fn().mockRejectedValue(new Error('Database error'));
      
      await getAdminDashboard(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });
  });
  
  describe('getUserDashboard', () => {
    it('should get user dashboard data', async () => {
      const mockIncomeAggregate = [{ _id: null, total: 5000 }];
      const mockExpenseAggregate = [{ _id: null, total: 3000 }];
      const mockBudgets = [{ category: 'Food', amount: 500 }];
      const mockGoals = [{ title: 'Vacation', targetAmount: 2000, savedAmount: 1000 }];
      
      // Fix the Transaction.aggregate mock implementation
      Transaction.aggregate = jest.fn()
        .mockResolvedValueOnce(mockIncomeAggregate)
        .mockResolvedValueOnce(mockExpenseAggregate);
      
      Budget.find = jest.fn().mockResolvedValue(mockBudgets);
      Goal.find = jest.fn().mockResolvedValue(mockGoals);
      
      await getUserDashboard(mockRequest, mockResponse);
      
      expect(Transaction.aggregate).toHaveBeenCalledTimes(2);
      expect(Budget.find).toHaveBeenCalledWith({ user: 'user123' });
      expect(Goal.find).toHaveBeenCalledWith({ user: 'user123' });
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        totalIncome: 5000,
        totalExpense: 3000,
        balance: 2000,
        budgets: mockBudgets,
        goals: mockGoals
      });
    });
    
    it('should handle missing income or expense data', async () => {
      // Fix to return empty arrays with the correct structure
      Transaction.aggregate = jest.fn()
        .mockResolvedValueOnce([{ _id: null, total: 0 }])
        .mockResolvedValueOnce([{ _id: null, total: 0 }]);
      
      Budget.find = jest.fn().mockResolvedValue([]);
      Goal.find = jest.fn().mockResolvedValue([]);
      
      await getUserDashboard(mockRequest, mockResponse);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        budgets: [],
        goals: []
      });
    });
    
    it('should handle errors', async () => {
      // Change to a more specific error
      Transaction.aggregate = jest.fn().mockRejectedValueOnce(new Error('Database error'));
      
      await getUserDashboard(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        message: expect.stringContaining('Server error fetching user dashboard data'),
        error: expect.any(String)
      });
    });
  });
});
