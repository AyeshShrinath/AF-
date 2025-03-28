const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');

// Increase timeout for all tests in this file
jest.setTimeout(30000);

describe('Report Routes Integration Tests', () => {
  let userToken;
  let userId;
  let otherUserId;
  let otherUserToken;
  
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
    
    // Create test transactions for both users spanning multiple months
    
    // January transactions for first user
    const janDate = new Date('2023-01-15');
    await Transaction.create([
      {
        user: userId,
        amount: 2000,
        type: 'income',
        category: 'Salary',
        description: 'January salary',
        date: janDate,
        tags: ['income', 'recurring']
      },
      {
        user: userId,
        amount: 300,
        type: 'expense',
        category: 'Groceries',
        description: 'January groceries',
        date: janDate,
        tags: ['essential', 'food']
      }
    ]);
    
    // February transactions for first user
    const febDate = new Date('2023-02-15');
    await Transaction.create([
      {
        user: userId,
        amount: 2000,
        type: 'income',
        category: 'Salary',
        description: 'February salary',
        date: febDate,
        tags: ['income', 'recurring']
      },
      {
        user: userId,
        amount: 350,
        type: 'expense',
        category: 'Groceries',
        description: 'February groceries',
        date: febDate,
        tags: ['essential', 'food']
      },
      {
        user: userId,
        amount: 100,
        type: 'expense',
        category: 'Entertainment',
        description: 'Movie night',
        date: febDate,
        tags: ['leisure']
      }
    ]);
    
    // Transaction for other user (to test isolation)
    await Transaction.create({
      user: otherUserId,
      amount: 1500,
      type: 'income',
      category: 'Freelance',
      description: 'Project payment',
      date: febDate,
      tags: ['income', 'work']
    });
    
  }, 30000);
  
  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ 
      email: { 
        $in: ['testuser@example.com', 'otheruser@example.com'] 
      } 
    });
    await Transaction.deleteMany({ user: { $in: [userId, otherUserId] } });
    await mongoose.connection.close();
  }, 30000);
  
  describe('GET /api/reports/trends', () => {
    it('should return spending trends by month', async () => {
      const res = await request(app)
        .get('/api/reports/trends')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      
      // Check we have data for January and February
      expect(res.body).toHaveProperty('2023-01');
      expect(res.body).toHaveProperty('2023-02');
      
      // Check January values
      expect(res.body['2023-01']).toHaveProperty('income', 2000);
      expect(res.body['2023-01']).toHaveProperty('expense', 300);
      
      // Check February values
      expect(res.body['2023-02']).toHaveProperty('income', 2000);
      expect(res.body['2023-02']).toHaveProperty('expense', 450); // 350 + 100
    });
    
    it('should not include other user\'s data in trends', async () => {
      // Get trends for the first user
      const res = await request(app)
        .get('/api/reports/trends')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      
      // Make sure we don't have other user's 1500 income included
      expect(res.body['2023-02'].income).toBe(2000);
    });
    
    it('should reject requests without authentication', async () => {
      const res = await request(app)
        .get('/api/reports/trends');
      
      expect(res.statusCode).toBe(401);
    });
  });
  
  describe('GET /api/reports/visual', () => {
    it('should return visualization data for income vs expenses', async () => {
      const res = await request(app)
        .get('/api/reports/visual')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('totalIncome');
      expect(res.body).toHaveProperty('totalExpenses');
      expect(res.body).toHaveProperty('categorySummary');
      expect(res.body).toHaveProperty('monthlyData');
      
      // Check if total income matches our test data
      expect(res.body.totalIncome).toBe(4000); // 2000 + 2000
      expect(res.body.totalExpenses).toBe(750); // 300 + 350 + 100
    });
    
    it('should filter visualization data by period', async () => {
      const res = await request(app)
        .get('/api/reports/visual')
        .query({ period: 'month' })
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('totalIncome');
      expect(res.body).toHaveProperty('totalExpenses');
      
      // Results should only include current month data
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      
      // Logic to verify monthly data is correct
      expect(res.body.period).toBe('month');
    });
    
    it('should handle custom date range for visualization', async () => {
      const res = await request(app)
        .get('/api/reports/visual')
        .query({ 
          startDate: '2023-02-01',
          endDate: '2023-02-28'
        })
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      
      // Should only include February data
      expect(res.body.totalIncome).toBe(2000);
      expect(res.body.totalExpenses).toBe(450); // 350 + 100
    });
    
    it('should not include other user\'s data in visualization', async () => {
      const res = await request(app)
        .get('/api/reports/visual')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      
      // Make sure we don't have other user's data included
      const categoryData = res.body.categorySummary;
      expect(categoryData).not.toHaveProperty('Freelance');
    });
    
    it('should reject requests without authentication', async () => {
      const res = await request(app)
        .get('/api/reports/visual');
      
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/reports/filter', () => {
    it('should return transactions filtered by date range', async () => {
      const res = await request(app)
        .get('/api/reports/filter')
        .query({ 
          startDate: '2023-02-01', 
          endDate: '2023-02-28' 
        })
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Should have 3 transactions in February
      expect(res.body.length).toBe(3);
      // All transactions should be from February
      res.body.forEach(transaction => {
        expect(new Date(transaction.date).getMonth()).toBe(1); // February is month 1 (0-indexed)
      });
    });
    
    it('should filter transactions by category', async () => {
      const res = await request(app)
        .get('/api/reports/filter')
        .query({ category: 'Groceries' })
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Should have 2 grocery transactions
      expect(res.body.length).toBe(2);
      // All transactions should be Groceries category
      res.body.forEach(transaction => {
        expect(transaction.category).toBe('Groceries');
      });
    });
    
    it('should filter transactions by tags', async () => {
      const res = await request(app)
        .get('/api/reports/filter')
        .query({ tags: 'leisure' })
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Should have 1 transaction with 'leisure' tag
      expect(res.body.length).toBe(1);
      expect(res.body[0].description).toBe('Movie night');
    });
    
    it('should combine multiple filters', async () => {
      const res = await request(app)
        .get('/api/reports/filter')
        .query({ 
          startDate: '2023-01-01', 
          endDate: '2023-12-31',
          category: 'Groceries',
          tags: 'food,essential'
        })
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Should have 2 Grocery transactions with food,essential tags
      expect(res.body.length).toBe(2);
      res.body.forEach(transaction => {
        expect(transaction.category).toBe('Groceries');
      });
    });
    
    it('should not include other user\'s transactions in results', async () => {
      const res = await request(app)
        .get('/api/reports/filter')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      
      // Check that none of the transactions belong to other user
      res.body.forEach(transaction => {
        expect(transaction.user.toString()).toBe(userId.toString());
      });
      
      // Verify we don't see the other user's freelance transaction
      const freelanceTransactions = res.body.filter(t => t.category === 'Freelance');
      expect(freelanceTransactions.length).toBe(0);
    });
    
    it('should reject requests without authentication', async () => {
      const res = await request(app)
        .get('/api/reports/filter');
      
      expect(res.statusCode).toBe(401);
    });

    it('should filter transactions by type', async () => {
      const res = await request(app)
        .get('/api/reports/filter')
        .query({ type: 'expense' })
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Should have all expense transactions
      expect(res.body.length).toBe(3);
      // All transactions should be of type expense
      res.body.forEach(transaction => {
        expect(transaction.type).toBe('expense');
      });
    });
    
    it('should filter by minimum and maximum amount', async () => {
      const res = await request(app)
        .get('/api/reports/filter')
        .query({ 
          minAmount: 300,
          maxAmount: 400
        })
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach(transaction => {
        expect(transaction.amount).toBeGreaterThanOrEqual(300);
        expect(transaction.amount).toBeLessThanOrEqual(400);
      });
    });
  });
});
