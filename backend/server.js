const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorMiddleware');
const logger = require('./utils/logger');
const socketHandler = require('./sockets');

dotenv.config({ path: path.join(__dirname, '.env') });

if (!process.env.JWT_SECRET) {
  throw new Error('Missing required environment variable: JWT_SECRET');
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

socketHandler(io);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: logger.stream }));
app.use(rateLimiter);

// Routes
app.use('/auth', require('./routes/authRoutes'));
app.use('/labs', require('./routes/labRoutes'));
app.use('/inventory', require('./routes/inventoryRoutes'));
app.use('/store-items', require('./routes/storeRoutes'));
app.use('/store-allotments', require('./routes/storeAllotmentRoutes'));
app.use('/transactions', require('./routes/transactionRoutes'));
app.use('/users', require('./routes/userRoutes'));
app.use('/logs', require('./routes/logRoutes'));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('Database connection failed', { error });
    console.error('Database connection failed', error);
    process.exit(1);
  });

module.exports = { app, io };
