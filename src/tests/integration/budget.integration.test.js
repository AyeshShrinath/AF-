const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const Budget = require('../../models/Budget');
const Transaction = require('../../models/Transaction');

// Increase timeout for all tests in this file
jest.setTimeout(30000);

describe('Budget Routes Integration Tests', () => {
  let userToken;
  let userId;
  let otherUserId;
  let otherUserToken;
  let budgetId;
  
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
    await Budget.deleteMany({ user: { $in: [userId, otherUserId] } });
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
    
    // Create transactions for testing budget status
    await Transaction.create([
      {
        user: userId,
        amount: 300,
        type: 'expense',
        category: 'Groceries',
        description: 'Weekly groceries',
        date: new Date()
      },
      {
        user: userId,
        amount: 150,
        type: 'expense',
        category: 'Dining',
        description: 'Restaurant dinner',
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
    await Budget.deleteMany({ user: { $in: [userId, otherUserId] } });
    await Transaction.deleteMany({ user: { $in: [userId, otherUserId] } });
    await mongoose.connection.close();
  }, 30000);
  
  describe('POST /api/budgets', () => {
    it('should create a new budget when all required fields are provided', async () => {
      const budgetData = {
        category: 'Groceries',
        amount: 500,
        period: 'monthly',
        alertThreshold: 80
      };
      
      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userToken}`)
        .send(budgetData);
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('category', 'Groceries');
      expect(res.body).toHaveProperty('amount', 500);
      expect(res.body).toHaveProperty('period', 'monthly');
      expect(res.body).toHaveProperty('alertThreshold', 80);
      
      budgetId = res.body._id; // Save for later tests
    });
    
    it('should reject budget creation when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          category: 'Incomplete Budget'
          // Missing amount and period
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
    });
    
    it('should reject budget creation without authentication', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .send({
          category: 'Unauthorized Budget',
          amount: 1000,
          period: 'monthly'
        });
      
      expect(res.statusCode).toBe(401);
    });
  });
  
  describe('GET /api/budgets', () => {
    it('should return all budgets for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/budgets')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('category', 'Groceries');
      expect(res.body[0].user.toString()).toBe(userId.toString());
    });
    
    it('should not return budgets from other users', async () => {
      // Create a budget for the other user
      await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          category: 'Other User Budget',
          amount: 300,
          period: 'monthly'
        });
      
      // Get budgets for the first user
      const res = await request(app)
        .get('/api/budgets')
        .set('Authorization', `Bearer ${userToken}`);
      
      // Make sure we don't see the other user's budgets
      const otherUserBudgets = res.body.filter(budget => budget.category === 'Other User Budget');
      expect(otherUserBudgets.length).toBe(0);
    });
    
    it('should reject request without authentication', async () => {
      const res = await request(app)
        .get('/api/budgets');
      
      expect(res.statusCode).toBe(401);
    });
  });
  
  describe('PUT /api/budgets/:id', () => {
    it('should update a budget successfully', async () => {
      const updatedData = {
        category: 'Groceries',
        amount: 600,
        alertThreshold: 70
      };
      
      const res = await request(app)
        .put(`/api/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updatedData);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('amount', 600);
      expect(res.body).toHaveProperty('alertThreshold', 70);
    });
    
    it('should reject updates to budgets owned by other users', async () => {
      // Create a budget for the other user
      const otherBudget = await Budget.create({
        user: otherUserId,
        category: 'Other User Budget',
        amount: 300,
        period: 'monthly'
      });
      
      // Try to update it with the first user's token
      const res = await request(app)
        .put(`/api/budgets/${otherBudget._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 1000
        });
      
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Not authorized');
    });
    
    it('should handle non-existent budget IDs', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/budgets/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 700
        });
      
      expect(res.statusCode).toBe(404);
    });
  });
  
  describe('DELETE /api/budgets/:id', () => {
    it('should delete a budget successfully', async () => {
      // Create a budget to delete
      const budgetToDelete = await Budget.create({
        user: userId,
        category: 'Budget to Delete',
        amount: 200,
        period: 'monthly'
      });
      
      const res = await request(app)
        .delete(`/api/budgets/${budgetToDelete._id}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Budget removed');
      
      // Verify it's deleted
      const deletedBudget = await Budget.findById(budgetToDelete._id);
      expect(deletedBudget).toBeNull();
    });
    
    it('should reject deletion of budgets owned by other users', async () => {
      // Create a budget for the other user
      const otherBudget = await Budget.create({
        user: otherUserId,
        category: 'Other User Budget to Not Delete',
        amount: 250,
        period: 'monthly'
      });
      
      // Try to delete it with the first user's token
      const res = await request(app)
        .delete(`/api/budgets/${otherBudget._id}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Not authorized');
      
      // Verify it's not deleted
      const budgetStillExists = await Budget.findById(otherBudget._id);
      expect(budgetStillExists).not.toBeNull();
    });
  });
  
  describe('GET /api/budgets/status', () => {
    it('should check budget status and alert if threshold exceeded', async () => {
      // Create a budget where the user has already spent a high percentage
      await Budget.create({
        user: userId,
        category: 'Dining',
        amount: 175, // User already spent 150, which is ~86%
        period: 'monthly',
        alertThreshold: 80 // Should trigger alert
      });
      
      const res = await request(app)
        .get('/api/budgets/status')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
      // The message should indicate that the threshold has been exceeded
      expect(res.body.message.toLowerCase()).toContain('alert');
    });
    
    it('should report all budgets within limits when applicable', async () => {
      // Delete existing budgets
      await Budget.deleteMany({ user: userId });
      
      // Create a budget that's well under the threshold
      await Budget.create({
        user: userId,
        category: 'Entertainment',
        amount: 500, // No expenses in this category
        period: 'monthly',
        alertThreshold: 80
      });
      
      const res = await request(app)
        .get('/api/budgets/status')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'All budgets are within limits.');
    });
  });

  describe('GET /api/budgets/recommendations', () => {
    it('should provide budget recommendations based on spending trends', async () => {
      // Create a budget
      const testBudget = await Budget.create({
        user: userId,
        category: 'Entertainment',
        amount: 300,
        period: 'monthly'
      });
      
      // Create some historical transactions
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      await Transaction.create([
        {
          user: userId,
          amount: 250,
          type: 'expense',
          category: 'Entertainment',
          description: 'Movie night',
          date: new Date(threeMonthsAgo.getTime() + 5 * 24 * 60 * 60 * 1000) // 5 days after
        },
        {
          user: userId,
          amount: 200,
          type: 'expense',
          category: 'Entertainment',
          description: 'Concert tickets',
          date: new Date(threeMonthsAgo.getTime() + 35 * 24 * 60 * 60 * 1000) // 35 days after
        },
        {
          user: userId,
          amount: 180,
          type: 'expense',
          category: 'Entertainment',
          description: 'Game purchase',
          date: new Date(threeMonthsAgo.getTime() + 65 * 24 * 60 * 60 * 1000) // 65 days after
        }
      ]);
      
      const res = await request(app)
        .get('/api/budgets/recommendations')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('recommendations');
      expect(res.body.recommendations).toBeInstanceOf(Array);
      expect(res.body.recommendations.length).toBeGreaterThan(0);
      expect(res.body.recommendations[0]).toHaveProperty('category', 'Entertainment');
      expect(res.body.recommendations[0]).toHaveProperty('recommendation');
      expect(res.body.recommendations[0]).toHaveProperty('currentBudget');
      expect(res.body.recommendations[0]).toHaveProperty('averageSpending');
    });
    
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/budgets/recommendations');
      
      expect(res.statusCode).toBe(401);
    });
  });
});
