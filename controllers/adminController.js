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
// ADMIN AUTHENTICATION
// ==========================================
// ==========================================
// ADMIN LOGIN
// ==========================================
exports.adminLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  if (user.role !== 'Platform-Owner') {
    return next(new AppError('Only Platform-Owners can access this route.', 403));
  }

  const token = signToken(user.id);

  res.status(200).json({
    status: 'success',
    token
  });
});

// ==========================================
// GYM LISTING & OVERVIEW
// ==========================================
// ==========================================
// GET ALL GYMS
// ==========================================
exports.getAllGyms = catchAsync(async (req, res, next) => {
  const gyms = await prisma.gym.findMany({
    include: {
      _count: {
        select: { members: { where: { status: 'active' } } }
      }
    }
  });

  const formattedGyms = gyms.map(gym => ({
    ...gym,
    activeMembers: gym._count.members,
    _count: undefined
  }));

  res.status(200).json({
    status: 'success',
    results: formattedGyms.length,
    data: { gyms: formattedGyms }
  });
});

// ==========================================
// SAAS: ACTIVATE GYM SUBSCRIPTION
// ==========================================
// ==========================================
// ACTIVATE GYM
// ==========================================
exports.activateGym = catchAsync(async (req, res, next) => {
  const { durationInMonths, price } = req.body;
  const gymId = req.params.gymId;

  if (!durationInMonths || price === undefined) {
    return next(new AppError('Please provide durationInMonths and price', 400));
  }

  const result = await prisma.$transaction(async (tx) => {
    const gym = await tx.gym.findUnique({ where: { id: gymId } });
    if (!gym) throw new AppError('Gym not found', 404);

    // Calculate new subscription end date
    const subscriptionEnd = new Date();
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + durationInMonths);

    const updatedGym = await tx.gym.update({
      where: { id: gymId },
      data: {
        status: 'active',
        subscriptionEnd
      }
    });

    // Record Platform Income
    if (price > 0) {
      await tx.platformFinancialLog.create({
        data: {
          gymId,
          amount: price,
          description: `SaaS Subscription Activation for ${durationInMonths} months`
        }
      });
    }

    return updatedGym;
  });

  res.status(200).json({
    status: 'success',
    data: { gym: result }
  });
});

// ==========================================
// SAAS: FREEZE GYM
// ==========================================
// ==========================================
// FREEZE GYM
// ==========================================
exports.freezeGym = catchAsync(async (req, res, next) => {
  const gymId = req.params.gymId;
  const gym = await prisma.gym.update({
    where: { id: gymId },
    data: { status: 'freeze' }
  });

  res.status(200).json({
    status: 'success',
    data: { gym }
  });
});

// ==========================================
// SAAS: SUSPEND GYM
// ==========================================
// ==========================================
// SUSPEND GYM
// ==========================================
exports.suspendGym = catchAsync(async (req, res, next) => {
  const gymId = req.params.gymId;
  const gym = await prisma.gym.update({
    where: { id: gymId },
    data: { status: 'suspended' }
  });

  res.status(200).json({
    status: 'success',
    data: { gym }
  });
});

// ==========================================
// SAAS: DELETE GYM
// ==========================================
// ==========================================
// DELETE GYM
// ==========================================
exports.deleteGym = catchAsync(async (req, res, next) => {
  await prisma.gym.delete({
    where: { id: req.params.gymId }
  });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// ==========================================
// SAAS: PLATFORM DASHBOARD
// ==========================================
// ==========================================
// GET PLATFORM DASHBOARD
// ==========================================
exports.getPlatformDashboard = catchAsync(async (req, res, next) => {
  const totalGyms = await prisma.gym.count();
  const activeGyms = await prisma.gym.count({ where: { status: 'active' } });

  const earningsData = await prisma.platformFinancialLog.aggregate({
    _sum: { amount: true }
  });

  const recentTransactions = await prisma.platformFinancialLog.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { gym: { select: { name: true } } }
  });

  res.status(200).json({
    status: 'success',
    data: {
      totalEarnings: earningsData._sum.amount || 0,
      totalGyms,
      activeGyms,
      recentTransactions
    }
  });
});
