const {
  addGoal,
  getGoals,
  updateGoal,
  deleteGoal,
  autoAllocateSavings,
  getGoalStatistics
} = require('../../controllers/goalController');
const Goal = require('../../models/Goal');
const Transaction = require('../../models/Transaction');

// Mock dependencies
jest.mock('../../models/Goal');
jest.mock('../../models/Transaction');

describe('Goal Controller Unit Tests', () => {
  let mockRequest;
  let mockResponse;
  
  beforeEach(() => {
    mockRequest = {
      user: { id: 'user456' },
      body: {},
      params: {},
      query: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('addGoal', () => {
    it('should return 400 if required fields are missing', async () => {
      mockRequest.body = { title: 'New Laptop', deadline: '2024-11-30' };
      
      await addGoal(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
    
    it('should create a goal successfully', async () => {
      mockRequest.body = {
        title: 'New Laptop',
        targetAmount: 1500,
        deadline: '2024-11-30',
        autoAllocate: false,
        category: 'Electronics',
        priority: 1,
        allocationPercentage: 10
      };
      
      const mockSave = jest.fn();
      Goal.mockImplementation(() => ({ save: mockSave }));
      
      await addGoal(mockRequest, mockResponse);
      
      expect(Goal).toHaveBeenCalledWith({
        user: 'user456',
        title: 'New Laptop',
        targetAmount: 1500,
        deadline: '2024-11-30',
        autoAllocate: false,
        category: 'Electronics',
        priority: 1,
        allocationPercentage: 10
      });
      expect(mockSave).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });
  });
  
  describe('getGoals', () => {
    it('should get all goals for a user', async () => {
      const mockGoals = [{ id: 'goal2', title: 'Car Upgrade', targetAmount: 8000 }];
      Goal.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue(mockGoals) });
      
      await getGoals(mockRequest, mockResponse);
      
      expect(Goal.find).toHaveBeenCalledWith({ user: 'user456' });
      expect(mockResponse.json).toHaveBeenCalledWith(mockGoals);
    });
  });
  
  describe('updateGoal', () => {
    it('should return 404 if goal not found', async () => {
      mockRequest.params = { id: 'goal2' };
      Goal.findById = jest.fn().mockResolvedValue(null);
      
      await updateGoal(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
    
    it('should update goal successfully', async () => {
      mockRequest.params = { id: 'goal2' };
      mockRequest.body = { savedAmount: 2500 };
      
      Goal.findById = jest.fn().mockResolvedValue({ user: 'user456', toString: () => 'user456' });
      const updatedGoal = { id: 'goal2', savedAmount: 2500 };
      Goal.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedGoal);
      
      await updateGoal(mockRequest, mockResponse);
      
      expect(Goal.findByIdAndUpdate).toHaveBeenCalledWith('goal2', { savedAmount: 2500 }, { new: true });
      expect(mockResponse.json).toHaveBeenCalledWith(updatedGoal);
    });
  });
  
  describe('deleteGoal', () => {
    it('should delete goal successfully', async () => {
      mockRequest.params = { id: 'goal2' };
      Goal.findById = jest.fn().mockResolvedValue({ user: 'user456', toString: () => 'user456' });
      Goal.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
      
      await deleteGoal(mockRequest, mockResponse);
      
      expect(Goal.deleteOne).toHaveBeenCalledWith({ _id: 'goal2' });
      expect(mockResponse.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });
  });
  
  describe('autoAllocateSavings', () => {
    it('should automatically allocate savings to goals', async () => {
      const mockGoals = [
        { id: 'goal3', savedAmount: 700, targetAmount: 5000, allocationPercentage: 20, priority: 1, progress: 14, save: jest.fn().mockResolvedValue(true) }
      ];
      
      Goal.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue(mockGoals) });
      const mockTransactions = [{ amount: 1200 }, { amount: 800 }];
      Transaction.find = jest.fn().mockResolvedValue(mockTransactions);
      
      await autoAllocateSavings(mockRequest, mockResponse);
      
      expect(Goal.find).toHaveBeenCalledWith({ user: 'user456', autoAllocate: true });
      expect(Transaction.find).toHaveBeenCalledWith({ user: 'user456', type: 'income' });
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('allocated'), totalAllocated: expect.any(Number) }));
      expect(mockGoals[0].save).toHaveBeenCalled();
    });
  });

  describe('getGoalStatistics', () => {
    it('should return goal statistics for visualization', async () => {
      const mockGoals = [
        { _id: 'goal4', title: 'Bike', savedAmount: 2000, targetAmount: 7000, category: 'Vehicle', progress: 28, daysRemaining: 90, deadline: new Date('2025-06-15') },
        { _id: 'goal5', title: 'Holiday Trip', savedAmount: 1500, targetAmount: 3000, category: 'Travel', progress: 50, daysRemaining: 45, deadline: new Date('2025-03-30') }
      ];
      
      Goal.find = jest.fn().mockResolvedValue(mockGoals);
      
      await getGoalStatistics(mockRequest, mockResponse);
      
      expect(Goal.find).toHaveBeenCalledWith({ user: 'user456' });
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ overallProgress: expect.any(Number), totalSaved: 3500, totalTarget: 10000, totalGoals: 2, categoryDistribution: expect.any(Object) }));
    });
  });
});
