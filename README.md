# PharmLab - Pharmaceutical Laboratory Management System

A comprehensive web-based solution for managing pharmaceutical laboratory operations, inventory, and student borrowings. PharmLab streamlines laboratory resource management with role-based access control and real-time updates.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database Models](#database-models)
- [User Roles](#user-roles)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

PharmLab is a full-stack pharmaceutical laboratory management system designed to:
- Manage laboratory inventory and resources
- Track student borrowings and returns
- Maintain activity logs for audit trails
- Provide role-based dashboards for different user types
- Enable real-time notifications via WebSockets

The system consists of:
- **Backend**: Node.js Express server with MongoDB database
- **Frontend**: React application with Vite build tool and Tailwind CSS styling

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Real-time Communication**: Socket.io
- **Logging**: Custom logger utility
- **Middleware**: JWT authentication, rate limiting, role-based access control

### Frontend
- **UI Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Custom store (authStore, appStore)
- **HTTP Client**: Axios
- **Real-time**: Socket.io Client
- **Code Quality**: ESLint, PostCSS

## 📁 Project Structure

```
PharmLab/
├── backend/                          # Node.js Express server
│   ├── config/                      # Database configuration
│   ├── controllers/                 # Request handlers
│   ├── middleware/                  # Custom middleware
│   ├── models/                      # MongoDB schemas
│   ├── routes/                      # API routes
│   ├── sockets/                     # WebSocket handlers
│   ├── utils/                       # Utility functions
│   ├── logs/                        # Application logs
│   ├── scripts/                     # Database seed scripts
│   ├── server.js                    # Entry point
│   └── package.json                 # Dependencies
│
└── Frontendd/PharmLab_Frontend/     # React Vite application
    ├── src/
    │   ├── components/              # React components
    │   │   ├── layout/             # Layout components
    │   │   └── ui/                 # Reusable UI components
    │   ├── pages/                  # Page components
    │   ├── services/               # API and Socket services
    │   ├── store/                  # State management
    │   ├── hooks/                  # Custom React hooks
    │   ├── utils/                  # Utility functions
    │   ├── App.jsx                 # Main App component
    │   ├── main.jsx                # React entry point
    │   └── index.css               # Global styles
    ├── public/                     # Static assets
    ├── vite.config.js              # Vite configuration
    ├── tailwind.config.js           # Tailwind CSS configuration
    ├── postcss.config.js            # PostCSS configuration
    └── package.json                # Dependencies
```

## ✨ Features

### Authentication & Authorization
- User registration and login
- JWT-based authentication
- Role-based access control (Admin, Lab Admin, Store Manager, Student)
- Session management

### Laboratory Management
- Lab inventory tracking
- Equipment and resource management
- Usage history and activity logs

### Store Management
- Store inventory system
- Item allotment tracking
- Store transactions

### Student Features
- Browse available items
- Request borrowings
- View borrowing history
- Track transactions

### Admin Dashboard
- System-wide overview
- User management
- Activity monitoring
- Audit logs

### Real-time Features
- WebSocket integration for live updates
- Activity notifications
- Real-time inventory updates

## 📦 Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **MongoDB** (local or cloud instance - MongoDB Atlas)
- **Git** (optional, for version control)

## 🚀 Installation

### 1. Clone or Extract Project
```bash
# Navigate to project directory
cd PharmLab
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment configuration (if needed)
# Configure database connection in config/db.js
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd Frontendd/PharmLab_Frontend

# Install dependencies
npm install
```

## ▶️ Running the Application

### Backend Server

```bash
cd backend

# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# Seed demo data (if needed)
npm run seed
```

The backend server will run on `http://localhost:5000` (or configured port)

### Frontend Application

```bash
cd Frontendd/PharmLab_Frontend

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The frontend will typically run on `http://localhost:5173` (Vite default)

### Running Together

You can run both in parallel by:
1. Opening two terminal windows
2. Running `npm run dev` in the backend directory in one terminal
3. Running `npm run dev` in the frontend directory in the other terminal

## 📡 API Documentation

### Authentication Routes
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### User Routes
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Laboratory Routes
- `GET /api/labs` - Get all labs
- `POST /api/labs` - Create new lab
- `PUT /api/labs/:id` - Update lab
- `DELETE /api/labs/:id` - Delete lab

### Inventory Routes
- `GET /api/inventory` - Get inventory items
- `POST /api/inventory` - Create inventory item
- `PUT /api/inventory/:id` - Update inventory
- `DELETE /api/inventory/:id` - Delete inventory

### Store Routes
- `GET /api/store` - Get store items
- `POST /api/store` - Create store item
- `PUT /api/store/:id` - Update store item

### Store Allotment Routes
- `GET /api/store-allotment` - Get allotments
- `POST /api/store-allotment` - Create allotment
- `PUT /api/store-allotment/:id` - Update allotment

### Transaction Routes
- `GET /api/transactions` - Get transactions
- `POST /api/transactions` - Create transaction

### Activity Logs Routes
- `GET /api/logs` - Get activity logs
- `POST /api/logs` - Create log entry

## 💾 Database Models

### User
- ID, Name, Email, Password, Role, Department, Created At

### Lab
- ID, Name, Description, Capacity, Equipment, Created At

### Inventory
- ID, Item Name, Quantity, Status, Lab ID, Created At

### StoreItem
- ID, Item Name, Quantity, Category, Store ID, Created At

### StoreAllotment
- ID, Store ID, Allotment Details, Quantity, Created At

### Transaction
- ID, User ID, Item ID, Transaction Type, Quantity, Date

### ActivityLog
- ID, User ID, Action, Entity, Details, Timestamp

## 👥 User Roles

1. **Super Admin**
   - Full system access
   - User management
   - System configuration

2. **Lab Admin**
   - Lab inventory management
   - Lab equipment tracking
   - Lab-specific reports

3. **Store Manager**
   - Store inventory management
   - Item allotments
   - Store transactions

4. **Student**
   - View available items
   - Request borrowings
   - View personal history

## ⚙️ Configuration

### Backend Configuration
Edit `backend/config/db.js` to configure:
- MongoDB connection string
- Database name
- Connection options

### Frontend Configuration
Edit environment variables in `Frontendd/PharmLab_Frontend/.env`:
- API base URL
- WebSocket server URL

### Middleware Configuration
- **Rate Limiter**: Configure in `backend/middleware/rateLimiter.js`
- **Authentication**: JWT settings in `backend/middleware/authMiddleware.js`
- **CORS**: Configure in `backend/server.js`

## 🔧 Troubleshooting

### Backend Issues

**Port Already in Use**
```bash
# Change port in server.js or use environment variable
# Or kill process using the port (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**MongoDB Connection Failed**
- Verify MongoDB is running
- Check connection string in `config/db.js`
- Ensure database credentials are correct

**Module Not Found**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Frontend Issues

**Port Already in Use**
```bash
# Vite uses 5173 by default, change in vite.config.js if needed
```

**Dependencies Error**
```bash
cd Frontendd/PharmLab_Frontend
rm -rf node_modules package-lock.json
npm install
```

**Build Errors**
```bash
# Clear cache and rebuild
npm run build
```

## 📝 Environment Variables

### Backend (.env recommended)
```
MONGODB_URI=mongodb://localhost:27017/pharmlab
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## 📄 License

[Add your license information here]

## 👤 Author

[Add author information here]

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/AmazingFeature`)
2. Commit changes (`git commit -m 'Add AmazingFeature'`)
3. Push to branch (`git push origin feature/AmazingFeature`)
4. Open a Pull Request

## 📞 Support

For issues, questions, or suggestions, please open an issue in the repository.

---

**Last Updated**: April 2026
