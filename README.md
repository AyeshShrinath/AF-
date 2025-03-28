# Personal Finance Tracker API

[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/xIbq4TFL)

## Setup Instructions

### Prerequisites
- Node.js (v14+)
- MongoDB (v4.4+)
- Git


### Installation
```bash


# Install dependencies
npm install

# Create environment files
cp .env.example .env
cp .env.test.example .env.test
```

### Environment Configuration
Configure the following variables in `.env` and `.env.test`:
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://pawarasasmina1:12341234@cluster0.krhqz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=mysecretkey123

```

## Running the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```




### Main API Endpoints

#### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

#### Transactions
- `GET /api/transactions` - Get all user transactions
- `POST /api/transactions` - Create a new transaction
- `PUT /api/transactions/:id` - Update a transaction
- `DELETE /api/transactions/:id` - Delete a transaction
- `GET /api/transactions/recurring` - Get upcoming recurring transactions

#### Budgets
- `GET /api/budgets` - Get all user budgets
- `POST /api/budgets` - Create a new budget
- `PUT /api/budgets/:id` - Update a budget
- `DELETE /api/budgets/:id` - Delete a budget
- `GET /api/budgets/status` - Check budget status

#### Financial Goals
- `GET /api/goals` - Get all user financial goals
- `POST /api/goals` - Create a new financial goal
- `PUT /api/goals/:id` - Update a financial goal
- `DELETE /api/goals/:id` - Delete a financial goal
- `POST /api/goals/auto-allocate` - Automatically allocate savings to goals

#### Reports
- `GET /api/reports/trends` - Get spending trends report
- `GET /api/reports/filter` - Get filtered transaction report

#### Notifications
- `GET /api/notifications/spending-alerts` - Get spending alerts
- `GET /api/notifications/bill-reminders` - Get upcoming bill reminders
- `GET /api/notifications/goal-reminders` - Get goal progress reminders

#### Currencies
- `POST /api/currency` - Set preferred currencies
- `GET /api/currency/rates` - Get exchange rates

#### Dashboard
- `GET /api/dashboard/user` - Get user dashboard summary
- `GET /api/dashboard/admin` - Get admin dashboard overview (admin only)

#### Admin
- `GET /api/admin/users` - Get all users (admin only)
- `PUT /api/admin/users/:id` - Update a user (admin only)
- `DELETE /api/admin/users/:id` - Delete a user (admin only)


### Response Formats
```javascript
// Success Response
{
  "status": "success",
  "data": {
    // Response data
  }
}

// Error Response
{
  "status": "error",
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## Security Features
- JWT Authentication
- Rate Limiting
- Input Validation
- XSS Protection
- CORS Configuration
- Password Hashing


### Running Unit Tests

Unit tests validate individual functions and components in isolation.

```bash
# Run all unit tests
npm run test:unit

# Run specific unit test file
npm run test:unit -- transactionController.test.js

# Run tests with coverage report
npm run test:coverage
```

### Running Integration Tests

Integration tests verify that different parts of the application work together.

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test file
npm run test:integration -- auth.integration.test.js
```

Notes:
- Integration tests require a running MongoDB instance
- Tests use an isolated database defined in your `.env.test` file
- The database is cleaned up before and after test runs

### Performance Testing

Performance tests check the application's behavior under load.

1. Install Artillery:
   ```bash
   npm install -g artillery
   ```

2. Run performance tests:
   ```bash
   # Run basic load test
   npm run test:performance
   
   # Generate HTML report
   artillery run -o report.json tests/performance/load-test.yml && artillery report report.json
   ```

## Testing

### Setting Up Test Environment
1. Ensure MongoDB is running
2. Configure test database in .env.test
3. Install test dependencies: `npm install --dev`



### Test Categories
- **Unit Tests**: Test individual components
- **Integration Tests**: Test API endpoints and data flow
- **Security Tests**: Test authentication and vulnerabilities
- **Performance Tests**: Test API under load


### Test Scenarios
- Normal Load: 5 requests/second
- Peak Load: 50 requests/second
- Sustained Load: 3 minutes duration

## Error Handling
The API uses standard HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Server Error

