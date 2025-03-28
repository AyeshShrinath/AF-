const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const Goal = require('../../models/Goal');

// Increase timeout for all tests in this file
jest.setTimeout(30000);

describe('Notification Routes Integration Tests', () => {
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
    await Goal.deleteMany({ user: { $in: [userId, otherUserId] } });
    
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
    
    // Create test transactions with high spending in a category
    await Transaction.create([
      {
        user: userId,
        amount: 600,
        type: 'expense',
        category: 'Dining',
        description: 'Expensive restaurant',
        date: new Date(),
        tags: ['luxury']
      },
      {
        user: userId,
        amount: 400,
        type: 'expense',
        category: 'Dining',
        description: 'Another restaurant',
        date: new Date(),
        tags: ['luxury']
      },
      {
        user: userId,
        amount: 200,
        type: 'expense',
        category: 'Groceries',
        description: 'Weekly groceries',
        date: new Date(),
        tags: ['essential']
      }
    ]);
    
    // Create recurring transactions for bill reminders
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 5);
    
    await Transaction.create([
      {
        user: userId,
        amount: 150,
        type: 'expense',
        category: 'Utilities',
        description: 'Electricity bill',
        date: nextWeekDate,
        tags: ['bill'],
        isRecurring: true
      }
    ]);
    
    // Create goals for reminders
    const goalDeadline = new Date();
    goalDeadline.setDate(goalDeadline.getDate() + 25); // 25 days from now
    
    await Goal.create([
      {
        user: userId,
        title: 'Emergency Fund',
        targetAmount: 5000,
        savedAmount: 1000,
        deadline: goalDeadline,
        autoAllocate: true
      }
    ]);
    
    // Create test data for the other user (to test isolation)
    await Transaction.create([
      {
        user: otherUserId,
        amount: 700,
        type: 'expense',
        category: 'Electronics',
        description: 'New gadget',
        date: new Date(),
        tags: ['luxury']
      }
    ]);
    
    await Goal.create([
      {
        user: otherUserId,
        title: 'Other User Goal',
        targetAmount: 3000,
        savedAmount: 500,
        deadline: goalDeadline,
        autoAllocate: true
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
    await Transaction.deleteMany({ user: { $in: [userId, otherUserId] } });
    await Goal.deleteMany({ user: { $in: [userId, otherUserId] } });
    await mongoose.connection.close();
  }, 30000);
  
  describe('GET /api/notifications/spending_alerts', () => {
    it('should return alerts for high spending categories', async () => {
      const res = await request(app)
        .get('/api/notifications/spending_alerts')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('alerts');
      expect(Array.isArray(res.body.alerts)).toBe(true);
      
      // Should have an alert for Dining (1000 total)
      const diningAlert = res.body.alerts.find(alert => alert.includes('Dining'));
      expect(diningAlert).toBeDefined();
      
      // Should not have an alert for Groceries (only 200)
      const groceriesAlert = res.body.alerts.find(alert => alert.includes('Groceries'));
      expect(groceriesAlert).toBeUndefined();
    });
    
    it('should not include other users\' spending data in alerts', async () => {
      const res = await request(app)
        .get('/api/notifications/spending_alerts')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      
      // Should not have an alert for Electronics (other user's category)
      const electronicsAlert = res.body.alerts.find(alert => alert.includes('Electronics'));
      expect(electronicsAlert).toBeUndefined();
    });
    
    it('should reject requests without authentication', async () => {
      const res = await request(app)
        .get('/api/notifications/spending_alerts');
      
      expect(res.statusCode).toBe(401);
    });
  });
  
  describe('GET /api/notifications/bill_reminders', () => {
    it('should return upcoming bill reminders', async () => {
      const res = await request(app)
        .get('/api/notifications/bill_reminders')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('reminders');
      expect(Array.isArray(res.body.reminders)).toBe(true);
      expect(res.body.reminders.length).toBeGreaterThan(0);
      
      // Check that the electricity bill reminder exists
      const electricityReminder = res.body.reminders.find(reminder => 
        reminder.message.includes('Electricity') || reminder.message.includes('Utilities')
      );
      expect(electricityReminder).toBeDefined();
    });
    
    it('should accept daysAhead parameter to control reminder timeframe', async () => {
      // Request with a very short timeframe (1 day)
      const res = await request(app)
        .get('/api/notifications/bill_reminders')
        .query({ daysAhead: 1 })
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      
      // Should not have any reminders since our bill is 5 days ahead
      expect(res.body.reminders.length).toBe(0);
    });
    
    it('should reject requests without authentication', async () => {
      const res = await request(app)
        .get('/api/notifications/bill_reminders');
      
      expect(res.statusCode).toBe(401);
    });
  });
  
  describe('GET /api/notifications/goal_reminders', () => {
    it('should return goal progress reminders', async () => {
      const res = await request(app)
        .get('/api/notifications/goal_reminders')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('reminders');
      expect(Array.isArray(res.body.reminders)).toBe(true);
      expect(res.body.reminders.length).toBeGreaterThan(0);
      
      // Check that the Emergency Fund reminder exists
      const emergencyFundReminder = res.body.reminders.find(reminder => 
        reminder.message.includes('Emergency Fund')
      );
      expect(emergencyFundReminder).toBeDefined();
    });
    
    it('should accept threshold parameter to control goal deadline cutoff', async () => {
      // Request with a very short threshold (10 days)
      const res = await request(app)
        .get('/api/notifications/goal_reminders')
        .query({ threshold: 10 })
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      
      // Should not have any reminders since our goal is 25 days away
      expect(res.body.reminders.length).toBe(0);
    });
    
    it('should not include other users\' goals in reminders', async () => {
      const res = await request(app)
        .get('/api/notifications/goal_reminders')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      
      // Should not have a reminder for "Other User Goal"
      const otherGoalReminder = res.body.reminders.find(reminder => 
        reminder.message.includes('Other User Goal')
      );
      expect(otherGoalReminder).toBeUndefined();
    });
    
    it('should reject requests without authentication', async () => {
      const res = await request(app)
        .get('/api/notifications/goal_reminders');
      
      expect(res.statusCode).toBe(401);
    });
  });
});
