const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const Currency = require('../../models/Currency');
const axios = require('axios');

// Mock axios to avoid making real API calls
jest.mock('axios');

// Increase timeout for all tests in this file
jest.setTimeout(30000);

describe('Currency Routes Integration Tests', () => {
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
    await Currency.deleteMany({ user: { $in: [userId, otherUserId] } });
    
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
    await Currency.deleteMany({ user: { $in: [userId, otherUserId] } });
    await mongoose.connection.close();
  }, 30000);
  
  describe('POST /api/currency', () => {
    it('should set preferred currencies for a user', async () => {
      const currencyData = {
        baseCurrency: 'USD',
        preferredCurrencies: ['EUR', 'GBP', 'JPY']
      };
      
      const res = await request(app)
        .post('/api/currency')
        .set('Authorization', `Bearer ${userToken}`)
        .send(currencyData);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('baseCurrency', 'USD');
      expect(res.body).toHaveProperty('preferredCurrencies');
      expect(Array.isArray(res.body.preferredCurrencies)).toBe(true);
      expect(res.body.preferredCurrencies).toEqual(expect.arrayContaining(['EUR', 'GBP', 'JPY']));
      expect(res.body.user.toString()).toBe(userId.toString());
    });
    
    it('should update existing currency settings', async () => {
      const updatedData = {
        baseCurrency: 'EUR',
        preferredCurrencies: ['USD', 'CAD']
      };
      
      const res = await request(app)
        .post('/api/currency')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updatedData);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('baseCurrency', 'EUR');
      expect(res.body.preferredCurrencies).toEqual(expect.arrayContaining(['USD', 'CAD']));
    });
    
    it('should reject requests with missing required fields', async () => {
      const res = await request(app)
        .post('/api/currency')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          baseCurrency: 'USD'
          // Missing preferredCurrencies
        });
      
      expect(res.statusCode).toBe(400);
    });
    
    it('should reject requests without authentication', async () => {
      const res = await request(app)
        .post('/api/currency')
        .send({
          baseCurrency: 'USD',
          preferredCurrencies: ['EUR', 'GBP']
        });
      
      expect(res.statusCode).toBe(401);
    });
  });
  
  describe('GET /api/currency/exchangerates', () => {
    beforeEach(() => {
      // Mock successful response from exchange rate API
      axios.get.mockResolvedValue({
        data: {
          result: 'success',
          base_code: 'EUR',
          conversion_rates: {
            EUR: 1,
            USD: 1.1,
            GBP: 0.85,
            CAD: 1.45
          }
        }
      });
    });
    
    it('should get exchange rates for user\'s preferred currencies', async () => {
      // Ensure we have currency settings first
      await Currency.findOneAndUpdate(
        { user: userId },
        {
          baseCurrency: 'EUR',
          preferredCurrencies: ['USD', 'GBP', 'CAD']
        },
        { upsert: true, new: true }
      );
      
      const res = await request(app)
        .get('/api/currency/exchangerates')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('baseCurrency', 'EUR');
      expect(res.body).toHaveProperty('exchangeRates');
      expect(res.body.exchangeRates).toHaveProperty('USD');
      expect(res.body.exchangeRates).toHaveProperty('GBP');
      expect(res.body.exchangeRates).toHaveProperty('CAD');
    });
    
    it('should handle API errors gracefully', async () => {
      // Mock API failure
      axios.get.mockRejectedValue(new Error('API error'));
      
      const res = await request(app)
        .get('/api/currency/exchangerates')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('message');
    });
    
    it('should return 400 if user has no currency settings', async () => {
      // Delete existing currency settings
      await Currency.deleteMany({ user: otherUserId });
      
      const res = await request(app)
        .get('/api/currency/exchangerates')
        .set('Authorization', `Bearer ${otherUserToken}`);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'User currency settings not found');
    });
    
    it('should reject requests without authentication', async () => {
      const res = await request(app)
        .get('/api/currency/exchangerates');
      
      expect(res.statusCode).toBe(401);
    });
  });
});
