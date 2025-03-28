const {
  checkSpendingPatterns,
  upcomingBillReminders,
  upcomingGoalReminders
} = require('../../controllers/notificationController');
const Transaction = require('../../models/Transaction');
const Budget = require('../../models/Budget');
const Goal = require('../../models/Goal');

// Mock dependencies
jest.mock('../../models/Transaction');
jest.mock('../../models/Budget');
jest.mock('../../models/Goal');

describe('Notification Controller Unit Tests', () => {
  let mockRequest;
  let mockResponse;
  
  beforeEach(() => {
    mockRequest = {
      user: { id: 'user123' },
      body: {},
      params: {},
      query: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('checkSpendingPatterns', () => {
    it('should detect high spending categories', async () => {
      const mockTransactions = [
        { type: 'expense', category: 'Food', amount: 600 },
        { type: 'expense', category: 'Entertainment', amount: 300 },
        { type: 'expense', category: 'Food', amount: 400 }
      ];
      
      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockTransactions)
      });
      
      await checkSpendingPatterns(mockRequest, mockResponse);
      
      expect(Transaction.find).toHaveBeenCalledWith({ user: 'user123' });
      expect(mockResponse.json).toHaveBeenCalledWith({
        alerts: expect.arrayContaining([expect.stringContaining('Food')])
      });
    });
    
    it('should return empty alerts for normal spending', async () => {
      const mockTransactions = [
        { type: 'expense', category: 'Food', amount: 200 },
        { type: 'expense', category: 'Entertainment', amount: 100 }
      ];
      
      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockTransactions)
      });
      
      await checkSpendingPatterns(mockRequest, mockResponse);
      
      expect(mockResponse.json).toHaveBeenCalledWith({ alerts: [] });
    });
    
    it('should handle errors', async () => {
      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Database error'))
      });
      
      await checkSpendingPatterns(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });
  });
  
  describe('upcomingBillReminders', () => {
    it('should return reminders for upcoming bills', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const mockBills = [
        { 
          isRecurring: true, 
          date: tomorrow, 
          amount: 50, 
          category: 'Utilities',
          toDateString: () => tomorrow.toDateString()
        }
      ];
      
      Transaction.find = jest.fn().mockResolvedValue(mockBills);
      
      await upcomingBillReminders(mockRequest, mockResponse);
      
      expect(Transaction.find).toHaveBeenCalledWith({
        user: 'user123',
        isRecurring: true,
        date: { $gte: expect.any(Date), $lte: expect.any(Date) }
      });
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        reminders: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('Utilities')
          })
        ])
      });
    });
    
    it('should handle errors', async () => {
      // Use mockImplementation instead of mockRejectedValue for more controlled error handling
      Transaction.find = jest.fn().mockImplementation(() => {
        return Promise.reject(new Error('Database error'));
      });
      
      await upcomingBillReminders(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });
  });
  
  describe('upcomingGoalReminders', () => {
    it('should return reminders for upcoming goals', async () => {
      const today = new Date();
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const mockGoals = [
        { 
          title: 'Vacation', 
          deadline: nextMonth, 
          targetAmount: 1000, 
          savedAmount: 500,
          toDateString: () => nextMonth.toDateString()
        }
      ];
      
      Goal.find = jest.fn().mockResolvedValue(mockGoals);
      
      await upcomingGoalReminders(mockRequest, mockResponse);
      
      expect(Goal.find).toHaveBeenCalledWith({
        user: 'user123',
        deadline: { $gte: expect.any(Date), $lte: expect.any(Date) }
      });
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        reminders: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('Vacation')
          })
        ])
      });
    });
    
    it('should handle errors', async () => {
      // Use mockImplementation instead of mockRejectedValue for more controlled error handling
      Goal.find = jest.fn().mockImplementation(() => {
        return Promise.reject(new Error('Database error'));
      });
      
      await upcomingGoalReminders(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });
  });
});
