
# FinPal Backend Setup with Node.js and MongoDB

This document provides instructions for setting up the FinPal backend using Node.js and MongoDB.

## Prerequisites

- Node.js (v14 or later)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn package manager

## Setup Instructions

### 1. Clone the backend repository

```bash
git clone https://github.com/your-username/finpal-backend.git
cd finpal-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory with the following variables:

```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/finpal
JWT_SECRET=your_jwt_secret_key
```

Replace the `MONGODB_URI` with your actual MongoDB connection string.

### 4. Start the development server

```bash
npm run dev
```

## API Documentation

### Authentication

- **POST /api/auth/register** - Register a new user
  ```
  {
    "name": "User Name",
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- **POST /api/auth/login** - Login with existing credentials
  ```
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- **GET /api/auth/me** - Get current user info (requires authentication)

### Expenses

- **GET /api/expenses** - Get all expenses for the logged-in user
- **POST /api/expenses** - Create a new expense
  ```
  {
    "title": "Grocery shopping",
    "amount": 85.75,
    "category": "Food",
    "date": "2025-04-01"
  }
  ```

- **PUT /api/expenses/:id** - Update an expense
- **DELETE /api/expenses/:id** - Delete an expense
- **GET /api/expenses/categories** - Get expense categories
- **POST /api/expenses/upload-receipt** - Upload and process a receipt image

## MongoDB Schema

### User Schema

```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
```

### Expense Schema

```javascript
const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  date: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});
```

## Backend Structure

The backend follows a modular architecture:

- `controllers/` - Request handlers
- `models/` - MongoDB schema definitions
- `routes/` - API route definitions
- `middleware/` - Custom middleware (auth, validation)
- `utils/` - Helper functions
- `config/` - Configuration files
