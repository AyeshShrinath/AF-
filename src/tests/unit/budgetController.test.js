const { registerUser, loginUser } = require('../../controllers/authController');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Auth Controller Unit Tests', () => {
  let mockRequest;
  let mockResponse;
  
  beforeEach(() => {
    mockRequest = {
      body: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Mock the JWT token generation
    jwt.sign = jest.fn().mockReturnValue('mock-token');
  });

  describe('registerUser', () => {
    it('should return 400 if user already exists', async () => {
      mockRequest.body = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123'
      };
      
      User.findOne = jest.fn().mockResolvedValue({ id: 'existingId' });
      
      await registerUser(mockRequest, mockResponse);
      
      expect(User.findOne).toHaveBeenCalledWith({ email: 'existing@example.com' });
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User already exists' });
    });
    
    it('should create a new user successfully', async () => {
      mockRequest.body = {
        name: 'Another User',
        email: 'another@example.com',
        password: 'securePass123'
      };
      
      User.findOne = jest.fn().mockResolvedValue(null);
      
      const mockUser = {
        id: 'anotherUserId',
        name: 'Another User',
        email: 'another@example.com',
        role: 'user'
      };
      User.create = jest.fn().mockResolvedValue(mockUser);
      
      await registerUser(mockRequest, mockResponse);
      
      expect(User.create).toHaveBeenCalledWith({
        name: 'Another User',
        email: 'another@example.com',
        password: 'securePass123',
        role: undefined
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        _id: 'anotherUserId',
        name: 'Another User',
        email: 'another@example.com',
        role: 'user',
        token: 'mock-token'
      });
    });
    
    it('should handle database errors', async () => {
      mockRequest.body = {
        name: 'Error User',
        email: 'error@example.com',
        password: 'password123'
      };
      
      User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));
      
      await registerUser(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
  
  describe('loginUser', () => {
    it('should return 401 if user not found', async () => {
      mockRequest.body = {
        email: 'unknown@example.com',
        password: 'password123'
      };
      
      User.findOne = jest.fn().mockResolvedValue(null);
      
      await loginUser(mockRequest, mockResponse);
      
      expect(User.findOne).toHaveBeenCalledWith({ email: 'unknown@example.com' });
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
    });
    
    it('should return 401 if password is incorrect', async () => {
      mockRequest.body = {
        email: 'sampleuser@example.com',
        password: 'wrongpassword'
      };
      
      User.findOne = jest.fn().mockResolvedValue({
        id: 'sampleUserId',
        email: 'sampleuser@example.com'
      });
      
      bcrypt.compare = jest.fn().mockResolvedValue(false);
      
      await loginUser(mockRequest, mockResponse);
      
      expect(bcrypt.compare).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
    
    it('should login user successfully with correct credentials', async () => {
      mockRequest.body = {
        email: 'verifieduser@example.com',
        password: 'correctPassword123'
      };
      
      const mockUser = {
        id: 'verifiedUserId',
        name: 'Verified User',
        email: 'verifieduser@example.com',
        role: 'admin'
      };
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      
      await loginUser(mockRequest, mockResponse);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        _id: 'verifiedUserId',
        name: 'Verified User',
        email: 'verifieduser@example.com',
        role: 'admin',
        token: 'mock-token'
      });
    });
  });
});