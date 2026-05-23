const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../prisma/client');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// ==========================================
// REGISTER
// ==========================================
exports.register = catchAsync(async (req, res, next) => {
  const { gymName, ownerName, email, phoneNumber, password, address, planId } = req.body;

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Prisma Transaction
  const result = await prisma.$transaction(async (tx) => {
    let maxReceptionists = 1;
    let maxCoaches = 4;

    if (planId) {
      const plan = await tx.saasPlan.findUnique({ where: { id: planId } });
      if (plan) {
        maxReceptionists = plan.maxReceptionists || 1;
        maxCoaches = plan.maxCoaches || 4;
      }
    }

    const newGym = await tx.gym.create({
      data: {
        name: gymName,
        ownerName,
        email,
        address,
        maxReceptionists,
        maxCoaches
      }
    });

    const newUser = await tx.user.create({
      data: {
        gymId: newGym.id,
        name: ownerName,
        email,
        phoneNumber,
        password: hashedPassword,
        role: 'Gym-Owner'
      }
    });

    return { newGym, newUser };
  });

  res.status(201).json({
    status: 'success',
    message: 'Gym registered successfully. Status is pending approval.',
    data: {
      gym: result.newGym,
      user: {
        id: result.newUser.id,
        name: result.newUser.name,
        email: result.newUser.email,
        role: result.newUser.role
      }
    }
  });
});

// ==========================================
// LOGIN
// ==========================================
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  if (user.role === 'Platform-Owner') {
    return next(new AppError('Platform-Owners must use the /admin/login endpoint.', 403));
  }

  const gym = await prisma.gym.findUnique({ where: { id: user.gymId } });
  if (!gym) {
    return next(new AppError('Gym not found', 404));
  }
  
  if (gym.status !== 'active') {
    return next(new AppError('Your gym account is not active. Please contact support.', 403));
  }

  const token = signToken(user.id);
  res.status(200).json({
    status: 'success',
    token,
    role: user.role,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    gym: {
      id: gym.id,
      gymName: gym.name,
      ownerName: gym.ownerName,
      email: gym.email,
      address: gym.address,
      status: gym.status
    }
  });
});
