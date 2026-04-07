# 🧪 RasayanFlow - Pharmaceutical Laboratory Management System

**Production-Ready • Enterprise-Grade • Professional UI**

A comprehensive, production-ready web application for managing pharmaceutical laboratory operations, inventory tracking, student borrowings, and chemical abstracts. Built with modern technologies and deployed on Render for scalability.

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

**RasayanFlow** streamlines pharmaceutical laboratory operations with:

✅ **Real-Time Inventory Management** - Track chemicals, reagents, and equipment  
✅ **Student Borrowing System** - Automated request/approval workflow  
✅ **Chemical Abstracts** - Auto-fetch from PubMed or AI-generated fallbacks  
✅ **Multi-Lab Support** - Manage multiple labs with dedicated admins  
✅ **WebSocket Integration** - Live updates across all users  
✅ **Complete Audit Trail** - Activity logging for compliance  
✅ **Professional UI** - Dark mode, responsive design, polished components  
✅ **Production Ready** - Deployed on Render, optimized performance  

### Architecture
- **Backend**: Node.js + Express + MongoDB + Socket.io
- **Frontend**: React + Vite + Zustand + TailwindCSS
- **Deployment**: Render (both frontend & backend)
- **Database**: MongoDB Atlas (cloud)

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
│   ├── scripts/                     # Maintenance scripts
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
Quick Start (Local Development)

### Prerequisites
- **Node.js** v18+ ([Download](https://nodejs.org/))
- **MongoDB** ([Local](https://docs.mongodb.com/manual/installation/) or [Atlas Cloud](https://www.mongodb.com/cloud/atlas))
- **Git** (optional)

### Installation

**1. Clone Repository**
```bash
git clone https://github.com/vanshaj45/RasayanFlow.git
cd RasayanFlow
```

**2. Backend Setup**
```bash
cd backend
npm install
cp .env.example .env

# Edit .env with your values:
# MONGO_URI = your MongoDB connection string
# JWT_SECRET = a secure random key
# SUPER_ADMIN_EMAIL = bootstrap super admin account email
npm run dev             # Start server on :5000
```

**3. Frontend Setup** (in new terminal)
```bash
cd Frontendd/PharmLab_Frontend
npm install
cp .env.example .env

# Edit .env:
# VITE_API_BASE_URL = http://localhost:5000
npm run dev             # Start on :5173
```

Open http://localhost:5173 in your browser.


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
- `PUT /api/auth/password` - Change the current password

### User Routes
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/super-admins` - Create another super admin

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
# O🚢 Production Deployment (Render)

### Deploy Backend
1. Push code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Create **New Web Service**
4. Connect your GitHub repo
5. Set build command: `npm install && npm start`
6. Add environment variables:
   ```
   MONGO_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_secure_secret
   PORT=5000
   NODE_ENV=production
   ```
7. Deploy ✅

### Deploy Frontend
1. Create new **Static Site** on Render
2. Connect same GitHub repo
3. Set build command:
   ```
   cd Frontendd/PharmLab_Frontend && npm install && npm run build
   ```
4. Set publish directory: `Frontendd/PharmLab_Frontend/dist`
5. Add environment variable:
   ```
   VITE_API_BASE_URL=https://your-backend-service.onrender.com
   ```
6. Deploy ✅

Deployed at:
- Frontend: https://your-frontend.onrender.com
- Backend: https://your-backend.onrender.com

## 📚 Environment Variables

### Backend (.env)
```bash
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/pharmlab
JWT_SECRET=your-secret-jwt-key-change-this
PORT=5000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
NODE_ENV=development
```

### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_API_TIMEOUT=30000
VITE_APP_NAME=PharmLab
VITE_DEBUG=true
```

## ✅ Production Features Implemented

- ✅ **Client-Side Routing**: `_redirects` file for SPA deployment
- ✅ **Error Handling**: Comprehensive try-catch + user-friendly messages
- ✅ **Loading States**: Spinners, skeleton loaders, disabled buttons
- ✅ **Auth Persistence**: localStorage + auto-login on refresh
- ✅ **Protected Routes**: Role-based access control
- ✅ **Code Splitting**: Lazy loading, optimized bundles
- ✅ **Performance**: Terser minification, tree-shaking
- ✅ **Real-Time**: WebSocket for live updates
- ✅ **Dark Mode**: Complete theme support
- ✅ **Responsive**: Mobile-first design
- ✅ **CORS**: Proper cross-origin configuration
- ✅ **Rate Limiting**: API rate limiting middleware
- ✅ **Logging**: Activity audit trail

## 🧪 Testing

```bash
# Backend syntax check
cd backend
node -c server.js

# Frontend build validation
cd Frontendd/PharmLab_Frontend
npm run lint
npm run build
```running
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
