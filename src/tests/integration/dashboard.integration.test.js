const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const Budget = require('../../models/Budget');
const Goal = require('../../models/Goal');

// Increase timeout for all tests in this file
jest.setTimeout(30000); // Set a 30 second timeout

describe('Dashboard Routes Integration Tests', () => {
  let adminToken;
  let userToken;
  let userId;
  let adminId;
  let otherUserId;
  let otherUserToken;
  
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI);
    
    // Clean up test users - updated to include all test accounts
    await User.deleteMany({ 
      email: { 
        $in: ['testadmin@example.com', 'testuser@example.com', 'otheruser@example.com'] 
      } 
    });
    
    // Create an admin user
    const adminUser = await User.create({
      name: 'Test Admin',
      email: 'testadmin@example.com',
      password: 'password123',
      role: 'admin'
    });
    adminId = adminUser._id;
    
    // Create a regular user
    const regularUser = await User.create({
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'password123'
    });
    userId = regularUser._id;
    
    // Create another user
    const otherUser = await User.create({
      name: 'Other User',
      email: 'otheruser@example.com',
      password: 'password123'
    });
    otherUserId = otherUser._id;
    
    // Clean up existing test data
    await Transaction.deleteMany({ user: { $in: [userId, otherUserId, adminId] } });
    await Budget.deleteMany({ user: { $in: [userId, otherUserId, adminId] } });
    await Goal.deleteMany({ user: { $in: [userId, otherUserId, adminId] } });
    
    // Login users to get tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testadmin@example.com',
        password: 'password123'
      });
    adminToken = adminLogin.body.token;
    
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'password123'
      });
    userToken = userLogin.body.token;
    
    const otherLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'otheruser@example.com',
        password: 'password123'
      });
    otherUserToken = otherLogin.body.token;
  }, 30000); // 30 second timeout for beforeAll
  
  afterAll(async () => {
    // Clean up - updated to include all test accounts
    await User.deleteMany({ 
      email: { 
        $in: ['testadmin@example.com', 'testuser@example.com', 'otheruser@example.com'] 
      } 
    });
    await Transaction.deleteMany({ user: { $in: [userId, otherUserId, adminId] } });
    await Budget.deleteMany({ user: { $in: [userId, otherUserId, adminId] } });
    await Goal.deleteMany({ user: { $in: [userId, otherUserId, adminId] } });
    await mongoose.connection.close();
  }, 30000); // 30 second timeout for afterAll

  describe('GET /api/dashboard/admin', () => {
    it('should return admin dashboard data when accessed by admin', async () => {
      const res = await request(app)
        .get('/api/dashboard/admin')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('totalUsers');
      expect(res.body).toHaveProperty('totalTransactions');
      expect(res.body).toHaveProperty('totalBudgets');
      expect(res.body).toHaveProperty('totalGoals');
      
      // Check types
      expect(typeof res.body.totalUsers).toBe('number');
      expect(typeof res.body.totalTransactions).toBe('number');
      expect(typeof res.body.totalBudgets).toBe('number');
      expect(typeof res.body.totalGoals).toBe('number');
    });
    
    it('should reject access for non-admin users', async () => {
      const res = await request(app)
        .get('/api/dashboard/admin')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('message');
    });
  });
  

});
