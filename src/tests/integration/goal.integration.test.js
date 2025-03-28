const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const Goal = require('../../models/Goal');
const Transaction = require('../../models/Transaction');

// Increase timeout for all tests in this file
jest.setTimeout(30000);

describe('Goal Routes Integration Tests', () => {
  let userToken;
  let userId;
  let otherUserId;
  let otherUserToken;
  let goalId;
  
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI);
    
    // Clean up test users
    await User.deleteMany({ 
      email: { 
        $in: ['testuser@example.com', 'otheruser@example.com'] 
      } 
    });
    
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
    await Goal.deleteMany({ user: { $in: [userId, otherUserId] } });
    await Transaction.deleteMany({ user: { $in: [userId, otherUserId] } });
    
    // Login users to get tokens
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
    
    // Create some transactions for auto-allocate testing
    await Transaction.create([
      {
        user: userId,
        amount: 2000,
        type: 'income',
        category: 'Salary',
        description: 'Monthly salary',
        date: new Date()
      },
      {
        user: userId,
        amount: 500,
        type: 'expense',
        category: 'Groceries',
        description: 'Weekly groceries',
        date: new Date()
      }
    ]);
  }, 30000);
  
  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ 
      email: { 
        $in: ['testuser@example.com', 'otheruser@example.com'] 
      } 
    });
    await Goal.deleteMany({ user: { $in: [userId, otherUserId] } });
    await Transaction.deleteMany({ user: { $in: [userId, otherUserId] } });
    await mongoose.connection.close();
  }, 30000);
  



  
  describe('DELETE /api/goals/:id', () => {
    it('should delete a goal successfully', async () => {
      // Create a goal to delete
      const goalToDelete = await Goal.create({
        user: userId,
        title: 'Goal to Delete',
        targetAmount: 1000,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      });
      
      const res = await request(app)
        .delete(`/api/goals/${goalToDelete._id}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Goal removed');
      
      // Verify it's deleted
      const deletedGoal = await Goal.findById(goalToDelete._id);
      expect(deletedGoal).toBeNull();
    });
    
    it('should reject deletion of goals owned by other users', async () => {
      // Create a goal for the other user
      const otherGoal = await Goal.create({
        user: otherUserId,
        title: 'Other User Goal to Not Delete',
        targetAmount: 2000,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      });
      
      // Try to delete it with the first user's token
      const res = await request(app)
        .delete(`/api/goals/${otherGoal._id}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Not authorized');
      
      // Verify it's not deleted
      const goalStillExists = await Goal.findById(otherGoal._id);
      expect(goalStillExists).not.toBeNull();
    });
  });
  
  describe('POST /api/goals/auto_allocate', () => {
    it('should auto-allocate savings to goals', async () => {
      // Create a goal with auto-allocate enabled
      const autoAllocateGoal = await Goal.create({
        user: userId,
        title: 'Auto Allocate Goal',
        targetAmount: 10000,
        savedAmount: 0,
        deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        autoAllocate: true
      });
      
      const res = await request(app)
        .post('/api/goals/auto_allocate')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
      
      // Check if goal was updated
      const updatedGoal = await Goal.findById(autoAllocateGoal._id);
      expect(updatedGoal.savedAmount).toBeGreaterThan(0);
    });
  });
});
