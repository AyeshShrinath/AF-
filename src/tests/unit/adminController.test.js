const {
  getUsers,
  updateUser,
  deleteUser
} = require('../../controllers/adminController');
const User = require('../../models/User');

// Mock dependencies
jest.mock('../../models/User');

describe('Admin Controller Unit Tests', () => {
  let mockRequest;
  let mockResponse;
  
  beforeEach(() => {
    mockRequest = {
      user: { id: 'admin456', role: 'admin' },
      body: {},
      params: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getUsers', () => {
    it('should get all users', async () => {
      const mockUsers = [
        { id: 'user3', name: 'User Three', email: 'user3@gmail.com', role: 'user' },
        { id: 'user4', name: 'User Four', email: 'user4@gmail.com', role: 'user' }
      ];
      
      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUsers)
      });
      
      await getUsers(mockRequest, mockResponse);
      
      expect(User.find).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockUsers);
    });
  });
  
  describe('updateUser', () => {
    it('should update user role successfully', async () => {
      mockRequest.params = { id: 'user3' };
      mockRequest.body = { role: 'admin' };
      
      const mockUser = {
        id: 'user3',
        name: 'User Three',
        email: 'user3@gmail.com',
        role: 'user',
        save: jest.fn().mockResolvedValue(true)
      };
      
      User.findById = jest.fn().mockResolvedValue(mockUser);
      
      await updateUser(mockRequest, mockResponse);
      
      expect(User.findById).toHaveBeenCalledWith('user3');
      expect(mockUser.role).toBe('admin');
      expect(mockUser.save).toHaveBeenCalled();
    });
  });
  
  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockRequest.params = { id: 'user4' };
      
      const mockUser = {
        id: 'user4',
        name: 'User Four',
        email: 'user4@gmail.com'
      };
      
      User.findById = jest.fn().mockResolvedValue(mockUser);
      User.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
      
      await deleteUser(mockRequest, mockResponse);
      
      expect(User.findById).toHaveBeenCalledWith('user4');
      expect(User.deleteOne).toHaveBeenCalledWith({ _id: 'user4' });
    });
  });
});
