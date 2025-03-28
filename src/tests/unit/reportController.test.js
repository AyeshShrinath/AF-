const {
  getSpendingTrends,
  getFilteredReport,
  getVisualizationData
} = require('../../controllers/reportController');
const Transaction = require('../../models/Transaction');

// Mock dependencies
jest.mock('../../models/Transaction');

describe('Report Controller Unit Tests', () => {
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

  describe('getSpendingTrends', () => {
    it('should get spending trends for a user', async () => {
      const mockTransactions = [
        { 
          date: new Date('2023-01-15'), 
          type: 'income', 
          amount: 1000,
          toISOString: () => '2023-01-15'
        },
        { 
          date: new Date('2023-01-20'), 
          type: 'expense', 
          amount: 500,
          toISOString: () => '2023-01-20'
        },
        { 
          date: new Date('2023-02-10'), 
          type: 'income', 
          amount: 1200,
          toISOString: () => '2023-02-10'
        }
      ];
      
      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockTransactions)
      });
      
      await getSpendingTrends(mockRequest, mockResponse);
      
      expect(Transaction.find).toHaveBeenCalledWith({ user: 'user123' });
      expect(mockResponse.json).toHaveBeenCalled();
    });
    
    it('should handle errors', async () => {
      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Database error'))
      });
      
      await getSpendingTrends(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });
  });
  
  describe('getFilteredReport', () => {
    it('should get filtered transactions without any filters', async () => {
      const mockTransactions = [
        { id: 'tx1', amount: 100 },
        { id: 'tx2', amount: 200 }
      ];
      
      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockTransactions)
      });
      
      await getFilteredReport(mockRequest, mockResponse);
      
      expect(Transaction.find).toHaveBeenCalledWith({ user: 'user123' });
      expect(mockResponse.json).toHaveBeenCalledWith(mockTransactions);
    });
    
    it('should apply date filters properly', async () => {
      mockRequest.query = {
        startDate: '2023-01-01',
        endDate: '2023-01-31'
      };
      
      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      });
      
      await getFilteredReport(mockRequest, mockResponse);
      
      expect(Transaction.find).toHaveBeenCalledWith({
        user: 'user123',
        date: {
          $gte: expect.any(Date),
          $lte: expect.any(Date)
        }
      });
    });
    
    it('should apply category filter properly', async () => {
      mockRequest.query = {
        category: 'Food'
      };
      
      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      });
      
      await getFilteredReport(mockRequest, mockResponse);
      
      expect(Transaction.find).toHaveBeenCalledWith({
        user: 'user123',
        category: 'Food'
      });
    });
    
    it('should apply tags filter properly', async () => {
      mockRequest.query = {
        tags: 'groceries,essentials'
      };
      
      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      });
      
      await getFilteredReport(mockRequest, mockResponse);
      
      expect(Transaction.find).toHaveBeenCalledWith({
        user: 'user123',
        tags: { $in: ['groceries', 'essentials'] }
      });
    });
    
    it('should handle errors', async () => {
      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Database error'))
      });
      
      await getFilteredReport(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });
  });

  describe('getVisualizationData', () => {
    it('should get visualization data for income vs expenses', async () => {
      const mockTransactions = [
        { 
          date: new Date('2023-01-15'), 
          type: 'income', 
          amount: 1000, 
          category: 'Salary' 
        },
        { 
          date: new Date('2023-01-20'), 
          type: 'income', 
          amount: 500, 
          category: 'Freelance' 
        },
        { 
          date: new Date('2023-01-25'), 
          type: 'expense', 
          amount: 300, 
          category: 'Groceries' 
        },
        { 
          date: new Date('2023-01-26'), 
          type: 'expense', 
          amount: 200, 
          category: 'Utilities' 
        },
        { 
          date: new Date('2023-01-27'), 
          type: 'expense', 
          amount: 100, 
          category: 'Entertainment' 
        }
      ];
      
      mockRequest.query = {
        period: 'all'  // Default period
      };

      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockTransactions)
      });
      
      await getVisualizationData(mockRequest, mockResponse);
      
      expect(Transaction.find).toHaveBeenCalledWith({ user: 'user123' });
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        totalIncome: 1500,
        totalExpenses: 600,
        categorySummary: expect.any(Object)
      }));
    });
    
    it('should filter visualization data by time period', async () => {
      mockRequest.query = {
        period: 'month'  // Monthly period
      };
      
      const mockTransactions = [
        { type: 'income', amount: 1000, category: 'Salary' },
        { type: 'expense', amount: 300, category: 'Groceries' }
      ];
      
      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockTransactions)
      });
      
      await getVisualizationData(mockRequest, mockResponse);
      
      expect(Transaction.find).toHaveBeenCalledWith({
        user: 'user123',
        date: expect.any(Object)
      });
    });
    
    it('should handle custom date range for visualization', async () => {
      mockRequest.query = {
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      };
      
      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      });
      
      await getVisualizationData(mockRequest, mockResponse);
      
      expect(Transaction.find).toHaveBeenCalledWith({
        user: 'user123',
        date: {
          $gte: expect.any(Date),
          $lte: expect.any(Date)
        }
      });
    });
    
    it('should handle errors', async () => {
      Transaction.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Database error'))
      });
      
      await getVisualizationData(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });
  });
});
