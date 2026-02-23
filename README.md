# Admin Panel Application

A full-stack admin panel application built with React.js and Express.js, featuring JWT authentication and role-based access control.

## ⚖️ LICENSE - IMPORTANT

**© 2026 InHouseAI-Org. All Rights Reserved.**

This is **proprietary software**. The code is made public for demonstration and portfolio purposes only.

🚫 **YOU MAY NOT:**
- Copy, reproduce, or duplicate any part of this code
- Modify, adapt, or create derivative works
- Distribute, sublicense, or transfer this software
- Use this software for commercial purposes
- Reverse engineer or decompile this software

✅ **YOU MAY:**
- View the code for learning and reference purposes only

**Unauthorized use, copying, or distribution of this software is strictly prohibited and may result in legal action.**

For licensing inquiries, contact: InHouseAI-Org

See the [LICENSE](LICENSE) file for full terms and conditions.

## Features

### Super Admin
- Login with credentials: `admin` / `admin`
- Create, read, update, and delete admin accounts
- Assign organizations to admins
- Manage custom usernames and passwords for admins

### Admin
- Manage users for their organization
- Create, read, update, and delete users
- User form with fields: username, password

### User
- Login with credentials created by their admin
- Submit daily data (Closing Stock and Sale)
- View and update their submitted data
- Managed by their organization's admin

### Technical Features
- JWT-based authentication
- Role-based authorization (Super Admin, Admin, and User)
- Mobile-first responsive design
- PostgreSQL database
- RESTful API

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # JWT authentication
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   └── server.js       # Express server
│   ├── package.json
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── components/     # React components
    │   ├── contexts/       # Auth context
    │   ├── pages/          # Page components
    │   ├── utils/          # API utilities
    │   ├── App.js
    │   └── index.js
    └── package.json
```

## Installation

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)

Make sure PostgreSQL is installed and running on your machine.

### Quick Start (All-in-One)

From the root directory:

```bash
# Install all dependencies
npm run install:all

# Initialize the database
cd backend && npm run init-db

# Start both frontend and backend
cd .. && npm start
```

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Initialize the database:
```bash
npm run init-db
```

This will create the `beershop` database, tables, and default super admin.

4. Start the server:
```bash
npm run dev
```

The backend server will run on `http://localhost:5001`

### Frontend Setup

1. Navigate to the frontend directory (in a new terminal):
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3002`

## Usage

### Super Admin Login
1. Navigate to `http://localhost:3002`
2. Login with:
   - Username: `admin`
   - Password: `admin`

3. You'll be directed to the Super Admin Dashboard where you can:
   - View all admins
   - Create new admins with custom username, password, and organization
   - Edit admin details (username, password, organization)
   - Delete admins (this also deletes all users in their organization)

### Admin Login
1. After creating an admin in the Super Admin Dashboard, logout
2. Login with the admin credentials you created
3. You'll be directed to the User Management Dashboard where you can:
   - View all users in your organization
   - Create new users with username and password
   - Edit user details (username, password)
   - Delete users

### User Login
1. After an admin creates a user account, you can login with those credentials
2. You'll be directed to the User Dashboard with a form to submit:
   - Closing Stock
   - Sale
3. Your data is automatically saved and can be updated anytime
4. Your account is managed by your organization's administrator

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verify JWT token

### Admins (Super Admin only)
- `GET /api/admins` - Get all admins
- `POST /api/admins` - Create admin
- `PUT /api/admins/:id` - Update admin
- `DELETE /api/admins/:id` - Delete admin

### Users (Admin and Super Admin)
- `GET /api/users` - Get all users (filtered by organization for admins)
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### User Self-Service
- `GET /api/users/me` - Get own user data
- `PUT /api/users/me` - Update own data (closing stock, sale)

## Technologies Used

### Backend
- Express.js - Web framework
- PostgreSQL - Database
- pg - PostgreSQL client
- jsonwebtoken - JWT authentication
- bcryptjs - Password hashing
- cors - Cross-origin resource sharing
- dotenv - Environment variables

### Frontend
- React.js - UI library
- React Router - Routing
- axios - HTTP client
- CSS - Styling (mobile-first)

## Security Features

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Protected routes on both frontend and backend
- Role-based access control
- Token verification middleware

## Database Configuration

The application uses **PostgreSQL** for persistent data storage. All data (super admin, admins, users) is stored in the database and persists across server restarts.

### Database Connection Settings

Configure your database connection in `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=bs_user
DB_PASSWORD=bs_password
DB_NAME=beershop
```

### Database Schema

The application uses three main tables:
- `super_admins` - Stores the super admin account
- `admins` - Stores admin accounts with their organizations
- `users` - Stores users belonging to each admin's organization

### First-Time Setup

Before running the application, you need to:

1. **Create PostgreSQL user** (if not exists):
```bash
psql -U your_postgres_user -c "CREATE USER bs_user WITH PASSWORD 'bs_password';"
psql -U your_postgres_user -c "ALTER USER bs_user CREATEDB;"
```

2. **Initialize the database**:
```bash
cd backend && npm run init-db
```

This will:
- Create the `beershop` database
- Create all required tables
- Set up indexes for performance
- Create the default super admin (username: `admin`, password: `admin`)

## Notes

- Default super admin credentials: username `admin`, password `admin`
- Update the JWT_SECRET in the `.env` file for production
- The application is mobile-first and responsive
- Data persists in PostgreSQL database
