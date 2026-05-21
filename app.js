const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const AppError = require('./utils/AppError');
const errorHandler = require('./middlewares/errorHandler');

// Route imports
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors());

// Rate Limiting
const limiter = rateLimit({
  max: 500,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/', limiter);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Ignore favicon requests to prevent 404 logs
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Basic health check route
app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Welcome to Flexora API' });
});

// Routes
// Note: No '/api' prefix as requested
app.use('/admin', adminRoutes);
app.use('/user', userRoutes);

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handling Middleware
app.use(errorHandler);

module.exports = app;
