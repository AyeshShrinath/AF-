const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');

// Increase timeout for all tests in this file
jest.setTimeout(30000);

describe('Transaction Routes Integration Tests', () => {
  let userToken;
  let userId;
  let otherUserId;
  let otherUserToken;
  let transactionId;
  let recurringTransactionId;
  
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
  
  describe('POST /api/transactions', () => {
    it('should create a new transaction when all required fields are provided', async () => {
      const transactionData = {
        type: 'expense',
        amount: 50,
        category: 'Entertainment',
        description: 'Movie tickets',
        tags: ['leisure', 'weekend']
      };
      
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(transactionData);
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('type', 'expense');
      expect(res.body).toHaveProperty('amount', 50);
      expect(res.body).toHaveProperty('category', 'Entertainment');
      expect(res.body.tags).toEqual(expect.arrayContaining(['leisure', 'weekend']));
      
      transactionId = res.body._id; // Save for later tests
    });
    
    it('should create a recurring transaction', async () => {
      const today = new Date();
      const nextMonth = new Date(today.setMonth(today.getMonth() + 1));
      
      const recurringData = {
        type: 'expense',
        amount: 100,
        category: 'Subscription',
        description: 'Monthly streaming service',
        isRecurring: true,
        recurrencePattern: 'monthly',
        recurrenceEndDate: nextMonth
      };
      
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send(recurringData);
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('isRecurring', true);
      expect(res.body).toHaveProperty('recurrencePattern', 'monthly');
      
      recurringTransactionId = res.body._id; // Save for recurring tests
    });
    
    it('should reject transaction creation when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          description: 'Incomplete Transaction'
          // Missing type, amount, and category
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
    });
    
    it('should reject transaction creation without authentication', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({
          type: 'expense',
          amount: 75,
          category: 'Food'
        });
      
      expect(res.statusCode).toBe(401);
    });
  });
  
  describe('GET /api/transactions', () => {
    beforeEach(async () => {
      // Add more test transactions for filtering and sorting tests
      await Transaction.create([
        {
          user: userId,
          type: 'income',
          amount: 2000,
          category: 'Salary',
          description: 'Monthly salary',
          date: new Date('2023-02-01'),
          tags: ['income', 'work']
        },
        {
          user: userId,
          type: 'expense',
          amount: 300,
          category: 'Groceries',
          description: 'Weekly groceries',
          date: new Date('2023-02-15'),
          tags: ['essential', 'food']
        },
        {
          user: otherUserId, // Transaction by other user
          type: 'expense',
          amount: 150,
          category: 'Shopping',
          description: 'Clothes shopping',
          date: new Date('2023-02-20'),
          tags: ['personal']
        }
      ]);
    });
    
    it('should return all transactions for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      // Should return at least the transactions we've created for this user
      // (2 from beforeEach + the ones from previous tests)
      expect(res.body.length).toBeGreaterThan(1);
      
      // Check that all returned transactions belong to the user
      res.body.forEach(transaction => {
        expect(transaction.user).toBe(userId.toString());
      });
    });
    
    it('should filter transactions by type', async () => {
      const res = await request(app)
        .get('/api/transactions?type=income')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      // All transactions should be of type income
      res.body.forEach(transaction => {
        expect(transaction.type).toBe('income');
      });
    });
    
    it('should filter transactions by category', async () => {
      const res = await request(app)
        .get('/api/transactions?category=Groceries')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      // All transactions should be of category Groceries
      res.body.forEach(transaction => {
        expect(transaction.category).toBe('Groceries');
      });
    });
    
    it('should filter transactions by tags', async () => {
      const res = await request(app)
        .get('/api/transactions?tags=food,essential')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      // Each transaction should have at least one of the specified tags
      res.body.forEach(transaction => {
        const hasMatchingTag = transaction.tags.some(
          tag => ['food', 'essential'].includes(tag)
        );
        expect(hasMatchingTag).toBe(true);
      });
    });
    
    it('should sort transactions by amount', async () => {
      const res = await request(app)
        .get('/api/transactions?sortBy=amount&order=desc')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      // Check that transactions are sorted by amount in descending order
      for (let i = 0; i < res.body.length - 1; i++) {
        expect(res.body[i].amount).toBeGreaterThanOrEqual(res.body[i + 1].amount);
      }
    });
    
    it('should not return transactions from other users', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      
      // No transaction should have the other user's ID
      const otherUserTransactions = res.body.filter(
        t => t.user === otherUserId.toString()
      );
      expect(otherUserTransactions.length).toBe(0);
    });
    
    it('should reject requests without authentication', async () => {
      const res = await request(app)
        .get('/api/transactions');
      
      expect(res.statusCode).toBe(401);
    });
  });
  
  describe('PUT /api/transactions/:id', () => {
    it('should update a transaction successfully', async () => {
      const updatedData = {
        amount: 75,
        description: 'Updated movie tickets and popcorn'
      };
      
      const res = await request(app)
        .put(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updatedData);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('amount', 75);
      expect(res.body).toHaveProperty('description', 'Updated movie tickets and popcorn');
      // Unchanged fields should remain
      expect(res.body).toHaveProperty('type', 'expense');
      expect(res.body).toHaveProperty('category', 'Entertainment');
    });
    
    it('should reject updates to transactions owned by other users', async () => {
      // Create a transaction for the other user
      const otherTransaction = await Transaction.create({
        user: otherUserId,
        type: 'expense',
        amount: 200,
        category: 'Other',
        description: 'Other user transaction'
      });
      
      // Try to update it with the first user's token
      const res = await request(app)
        .put(`/api/transactions/${otherTransaction._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 300
        });
      
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Not authorized');
    });
    
    it('should handle non-existent transaction IDs', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/transactions/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 100
        });
      
      expect(res.statusCode).toBe(404);
    });
  });
  
  describe('DELETE /api/transactions/:id', () => {
    it('should delete a transaction successfully', async () => {
      // Create a transaction to delete
      const transactionToDelete = await Transaction.create({
        user: userId,
        type: 'expense',
        amount: 30,
        category: 'Coffee',
        description: 'Morning coffee'
      });
      
      const res = await request(app)
        .delete(`/api/transactions/${transactionToDelete._id}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Transaction removed');
      
      // Verify it's deleted
      const deletedTransaction = await Transaction.findById(transactionToDelete._id);
      expect(deletedTransaction).toBeNull();
    });
    
    it('should reject deletion of transactions owned by other users', async () => {
      // Create a transaction for the other user
      const otherTransaction = await Transaction.create({
        user: otherUserId,
        type: 'expense',
        amount: 50,
        category: 'Other',
        description: 'Other user transaction to not delete'
      });
      
      // Try to delete it with the first user's token
      const res = await request(app)
        .delete(`/api/transactions/${otherTransaction._id}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Not authorized');
      
      // Verify it's not deleted
      const transactionStillExists = await Transaction.findById(otherTransaction._id);
      expect(transactionStillExists).not.toBeNull();
    });
  });
  
  describe('GET /api/transactions/recurring', () => {
    it('should return upcoming recurring transactions', async () => {
      // Make sure we have at least one recurring transaction
      const today = new Date();
      const nextMonth = new Date(today.setMonth(today.getMonth() + 1));
      
      // Create a new recurring transaction if none exists
      if (!recurringTransactionId) {
        const newRecurring = await Transaction.create({
          user: userId,
          type: 'expense',
          amount: 15,
          category: 'Subscription',
          description: 'Music streaming',
          isRecurring: true,
          recurrencePattern: 'monthly',
          recurrenceEndDate: nextMonth
        });
        recurringTransactionId = newRecurring._id;
      }
      
      const res = await request(app)
        .get('/api/transactions/recurring')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      // Should have at least one recurring transaction
      expect(res.body.length).toBeGreaterThan(0);
      
      // All returned transactions should be recurring
      res.body.forEach(transaction => {
        expect(transaction.isRecurring).toBe(true);
      });
    });
    
    it('should only return the authenticated user\'s recurring transactions', async () => {
      // Create a recurring transaction for the other user
      await Transaction.create({
        user: otherUserId,
        type: 'expense',
        amount: 25,
        category: 'Other Subscription',
        description: 'Other user recurring transaction',
        isRecurring: true,
        recurrencePattern: 'weekly',
        recurrenceEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
      
      const res = await request(app)
        .get('/api/transactions/recurring')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      
      // All transactions should belong to the user
      res.body.forEach(transaction => {
        expect(transaction.user).toBe(userId.toString());
      });
      
      // Check that we don't see the other user's subscription
      const otherUserTransactions = res.body.filter(
        t => t.category === 'Other Subscription'
      );
      expect(otherUserTransactions.length).toBe(0);
    });
    
    it('should reject requests without authentication', async () => {
      const res = await request(app)
        .get('/api/transactions/recurring');
      
      expect(res.statusCode).toBe(401);
    });
  });
});
