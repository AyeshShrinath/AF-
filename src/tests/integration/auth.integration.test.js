const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');

describe('Auth Routes Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI);
    
    // Clean up test users before tests
    await User.deleteMany({ email: /test.*@example\.com/i });
  });
  
  afterAll(async () => {
    // Clean up test users after tests
    await User.deleteMany({ email: /test.*@example\.com/i });
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Register',
          email: 'testregister@example.com',
          password: 'password123'
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      // User properties are at the top level, not nested in a user object
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('name', 'Test Register');
      expect(res.body).toHaveProperty('email', 'testregister@example.com');
      expect(res.body).toHaveProperty('role', 'user');
      expect(res.body).not.toHaveProperty('password');
    });

    it('should reject registration with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Incomplete User',
          email: 'incomplete@example.com'
          // Missing password
        });
      
      expect(res.statusCode).toBe(400);
    });

    it('should reject registration with existing email', async () => {
      // Try to register same email again
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email: 'testregister@example.com', // Already used above
          password: 'password123'
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message.toLowerCase()).toContain('user already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testregister@example.com',
          password: 'password123'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      // User properties are at the top level, not nested in a user object
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('email', 'testregister@example.com');
      expect(res.body).not.toHaveProperty('password');
    });

    it('should reject login with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });
      
      expect(res.statusCode).toBe(401);
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testregister@example.com',
          password: 'wrongpassword'
        });
      
      expect(res.statusCode).toBe(401);
    });
  });
});
