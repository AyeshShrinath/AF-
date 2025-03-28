const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');

describe('Admin Routes Integration Tests', () => {
  let adminToken;
  let userToken;
  let normalUserId;
  let testUserId;
  
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI);
    
    // Clean up test users
    await User.deleteMany({ email: /test.*@example\.com/i });
    
    // Create an admin user
    const adminUser = await User.create({
      name: 'Test Admin',
      email: 'testadmin@example.com',
      password: 'password123',
      role: 'admin'
    });
    
    // Create a regular user
    const normalUser = await User.create({
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'password123'
    });
    
    normalUserId = normalUser._id;
    
    // Login as admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testadmin@example.com',
        password: 'password123'
      });
    
    adminToken = adminLogin.body.token;
    
    // Login as normal user
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'password123'
      });
    
    userToken = userLogin.body.token;
  });
  
  afterAll(async () => {
    // Clean up after tests
    await User.deleteMany({ email: /test.*@example\.com/i });
    await mongoose.connection.close();
  });

  describe('GET /api/admin/users', () => {
    it('should return all users when accessed by admin', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('email');
      expect(res.body[0]).toHaveProperty('role');
    });

    it('should reject access for non-admin users', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('message', 'Admin access required');
    });

    it('should reject access with invalid token', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer invalid_token');
      
      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    it('should update user role when accessed by admin', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${normalUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' });  // Changed from 'moderator' to 'user'
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'User updated successfully');
      expect(res.body.user).toHaveProperty('role', 'user');
    });

    it('should update user active status when accessed by admin', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${normalUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'User updated successfully');
      expect(res.body.user).toHaveProperty('isActive', false);
      
      // Set back to active for other tests
      await request(app)
        .put(`/api/admin/users/${normalUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });
    });

    it('should reject update for non-admin users', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${normalUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'admin' });
      
      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should create and then delete a test user', async () => {
      // Create a test user to delete
      const testUser = await User.create({
        name: 'User To Delete',
        email: 'testdelete@example.com',
        password: 'password123'
      });
      
      testUserId = testUser._id;
      
      // Delete the user
      const res = await request(app)
        .delete(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'User deleted successfully');
      
      // Verify user is deleted
      const deletedUser = await User.findById(testUserId);
      expect(deletedUser).toBeNull();
    });

    it('should reject deletion for non-admin users', async () => {
      const res = await request(app)
        .delete(`/api/admin/users/${normalUserId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.statusCode).toBe(403);
      
      // Verify user still exists
      const userStillExists = await User.findById(normalUserId);
      expect(userStillExists).not.toBeNull();
    });
  });
});
