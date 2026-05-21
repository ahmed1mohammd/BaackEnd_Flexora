const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const prisma = require('../prisma/client');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!currentUser) {
    return next(new AppError('The user belonging to this token does no longer exist.', 401));
  }

  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log(`[AUTH] User ${req.user.email} with role ${req.user.role} attempting to access route restricted to ${roles.join(', ')}`);
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`You do not have permission. Your role is '${req.user.role}', but this route requires: ${roles.join(' or ')}`, 403));
    }
    next();
  };
};
