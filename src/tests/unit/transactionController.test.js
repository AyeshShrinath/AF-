const {
  addTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  getUpcomingRecurringTransactions
} = require('../../controllers/transactionController');
const Transaction = require('../../models/Transaction');

// Mock the Transaction model
jest.mock('../../models/Transaction');

describe('Transaction Controller Unit Tests', () => {
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

  describe('addTransaction', () => {
    it('should return 400 if required fields are missing', async () => {
      // Missing fields
      mockRequest.body = { type: 'expense', category: 'Food' };
      
      await addTransaction(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.any(String)
      }));
    });
    
    it('should create a transaction successfully', async () => {
      // Set request body
      mockRequest.body = {
        type: 'expense',
        amount: 100,
        category: 'Food',
        description: 'Groceries'
      };
      
      // Mock save method
      const mockSave = jest.fn();
      Transaction.mockImplementation(() => ({
        save: mockSave
      }));
      
      await addTransaction(mockRequest, mockResponse);
      
      expect(Transaction).toHaveBeenCalledWith({
        user: 'user123',
        type: 'expense',
        amount: 100,
        category: 'Food',
        description: 'Groceries'
      });
      expect(mockSave).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });
    
    it('should handle errors', async () => {
      mockRequest.body = {
        type: 'expense',
        amount: 100,
        category: 'Food'
      };
      
      // Mock save to throw an error
      Transaction.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error('Database error'))
      }));
      
      await addTransaction(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
  
  describe('getTransactions', () => {
    it('should get all transactions for a user', async () => {
      const mockTransactions = [{ id: 'tx1', amount: 100 }];
      Transaction.find = jest.fn().mockImplementation(() => ({
        sort: jest.fn().mockResolvedValue(mockTransactions)
      }));
      
      await getTransactions(mockRequest, mockResponse);
      
      expect(Transaction.find).toHaveBeenCalledWith({ user: 'user123' });
      expect(mockResponse.json).toHaveBeenCalledWith(mockTransactions);
    });
    
    it('should apply filters when provided', async () => {
      mockRequest.query = { 
        type: 'expense',
        category: 'Food',
        tags: 'groceries,essentials' 
      };
      
      const mockTransactions = [{ id: 'tx1', amount: 100 }];
      Transaction.find = jest.fn().mockImplementation(() => ({
        sort: jest.fn().mockResolvedValue(mockTransactions)
      }));
      
      await getTransactions(mockRequest, mockResponse);
      
      expect(Transaction.find).toHaveBeenCalledWith({
        user: 'user123',
        type: 'expense',
        category: 'Food',
        tags: { $in: ['groceries', 'essentials'] }
      });
    });
    
    it('should handle errors', async () => {
      Transaction.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await getTransactions(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
  
  describe('updateTransaction', () => {
    it('should return 404 if transaction not found', async () => {
      mockRequest.params = { id: 'tx1' };
      Transaction.findById = jest.fn().mockResolvedValue(null);
      
      await updateTransaction(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
    
    it('should return 401 if user not authorized', async () => {
      mockRequest.params = { id: 'tx1' };
      Transaction.findById = jest.fn().mockResolvedValue({
        user: 'otheruser456',
        toString: () => 'otheruser456'
      });
      
      await updateTransaction(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
    
    it('should update transaction successfully', async () => {
      mockRequest.params = { id: 'tx1' };
      mockRequest.body = { amount: 200 };
      
      Transaction.findById = jest.fn().mockResolvedValue({
        user: 'user123',
        toString: () => 'user123'
      });
      
      const updatedTransaction = { id: 'tx1', amount: 200 };
      Transaction.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedTransaction);
      
      await updateTransaction(mockRequest, mockResponse);
      
      expect(Transaction.findByIdAndUpdate).toHaveBeenCalledWith('tx1', { amount: 200 }, { new: true });
      expect(mockResponse.json).toHaveBeenCalledWith(updatedTransaction);
    });
  });
  
  describe('deleteTransaction', () => {
    it('should return 404 if transaction not found', async () => {
      mockRequest.params = { id: 'tx1' };
      Transaction.findById = jest.fn().mockResolvedValue(null);
      
      await deleteTransaction(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
    
    it('should return 401 if user not authorized', async () => {
      mockRequest.params = { id: 'tx1' };
      Transaction.findById = jest.fn().mockResolvedValue({
        user: 'otheruser456',
        toString: () => 'otheruser456'
      });
      
      await deleteTransaction(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
    
    it('should delete transaction successfully', async () => {
      mockRequest.params = { id: 'tx1' };
      
      Transaction.findById = jest.fn().mockResolvedValue({
        user: 'user123',
        toString: () => 'user123'
      });
      
      Transaction.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
      
      await deleteTransaction(mockRequest, mockResponse);
      
      expect(Transaction.deleteOne).toHaveBeenCalledWith({ _id: 'tx1' });
      expect(mockResponse.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });
  });
  
  describe('getUpcomingRecurringTransactions', () => {
    it('should get recurring transactions', async () => {
      const mockTransactions = [{ id: 'tx1', isRecurring: true }];
      Transaction.find = jest.fn().mockImplementation(() => ({
        sort: jest.fn().mockResolvedValue(mockTransactions)
      }));
      
      await getUpcomingRecurringTransactions(mockRequest, mockResponse);
      
      expect(Transaction.find).toHaveBeenCalledWith({
        user: 'user123',
        isRecurring: true,
        recurrenceEndDate: { $gte: expect.any(Date) }
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockTransactions);
    });
  });
});
