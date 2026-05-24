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

  if (user.role !== 'Platform-Owner' && user.role !== 'Platform-Manager') {
    return next(new AppError('Only Platform-Owners and Managers can access this route.', 403));
  }

  const token = signToken(user.id);

  res.status(200).json({
    status: 'success',
    token,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  });
});

// ==========================================
// UPDATE PASSWORD
// ==========================================
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return next(new AppError('Please provide old and new password', 400));
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
    return next(new AppError('كلمة المرور القديمة غير صحيحة', 401));
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword }
  });

  res.status(200).json({
    status: 'success',
    message: 'تم تحديث كلمة المرور بنجاح'
  });
});

// ==========================================
// PLATFORM TEAM MANAGEMENT
// ==========================================

// GET ALL PLATFORM TEAM MEMBERS
exports.getPlatformTeam = catchAsync(async (req, res, next) => {
  const team = await prisma.user.findMany({
    where: {
      role: {
        in: ['Platform-Owner', 'Platform-Manager']
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  res.status(200).json({
    status: 'success',
    results: team.length,
    data: { team }
  });
});

// CREATE PLATFORM MEMBER (Manager)
exports.createPlatformMember = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return next(new AppError('Please provide name, email, password, and role', 400));
  }

  if (role !== 'Platform-Owner' && role !== 'Platform-Manager') {
    return next(new AppError('Role must be Platform-Owner or Platform-Manager', 400));
  }

  // Check if email exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return next(new AppError('Email already in use', 400));
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      gymId: req.user.gymId // Tie to the same system gym ID
    }
  });

  res.status(201).json({
    status: 'success',
    data: {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    }
  });
});

// DELETE PLATFORM MEMBER
exports.deletePlatformMember = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return next(new AppError('You cannot delete your own account', 400));
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || (user.role !== 'Platform-Owner' && user.role !== 'Platform-Manager')) {
    return next(new AppError('Team member not found', 404));
  }

  if (user.email === 'snaptech.team.o@gmail.com') {
    return next(new AppError('لا يمكن حذف الحساب الأساسي للمنظومة', 403));
  }

  await prisma.user.delete({ where: { id } });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// GYM LISTING & OVERVIEW
// ==========================================
// ==========================================
// GET ALL GYMS
// ==========================================
exports.getAllGyms = catchAsync(async (req, res, next) => {
  const gyms = await prisma.gym.findMany({
    include: {
      users: {
        where: { role: 'Gym-Owner' },
        select: { phoneNumber: true }
      },
      _count: {
        select: { members: { where: { status: 'active' } } }
      }
    }
  });

  const formattedGyms = gyms.map(gym => ({
    ...gym,
    phoneNumber: gym.users[0]?.phoneNumber || '—',
    activeMembers: gym._count.members,
    users: undefined,
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
  const { durationInMonths, price, planId } = req.body;
  const gymId = req.params.gymId;

  if (!planId && (!durationInMonths || price === undefined)) {
    return next(new AppError('يرجى تقديم معرّف الباقة أو المدة والسعر يدوياً لتفعيل الاشتراك.', 400));
  }

  const result = await prisma.$transaction(async (tx) => {
    const gym = await tx.gym.findUnique({ where: { id: gymId } });
    if (!gym) throw new AppError('Gym not found', 404);

    let maxReceptionists = 1;
    let maxCoaches = 4;
    let subscriptionEnd = new Date();
    let finalPrice = price;
    let finalPlanId = planId || null;
    let finalPlanName = null;
    let finalPlanPrice = null;
    let planDurationDays = 0;

    if (planId) {
      const plan = await tx.saasPlan.findUnique({ where: { id: planId } });
      if (!plan) throw new AppError('عذراً، لم يتم العثور على الباقة المحددة في النظام.', 404);

      maxReceptionists = plan.maxReceptionists;
      maxCoaches = plan.maxCoaches;
      finalPrice = plan.price;
      finalPlanId = plan.id;
      finalPlanName = plan.planName;
      finalPlanPrice = plan.price;
      planDurationDays = plan.durationInDays;

      // Calculate end date based on durationInDays from today
      subscriptionEnd.setDate(subscriptionEnd.getDate() + plan.durationInDays);
    } else {
      planDurationDays = durationInMonths * 30;
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + durationInMonths);

      // Find the closest SaasPlan by duration in days
      const plans = await tx.saasPlan.findMany();
      let matchedPlan = null;
      let minDiff = Infinity;
      for (const plan of plans) {
        const diff = Math.abs(plan.durationInDays - planDurationDays);
        if (diff < minDiff) {
          minDiff = diff;
          matchedPlan = plan;
        }
      }

      if (matchedPlan) {
        maxReceptionists = matchedPlan.maxReceptionists;
        maxCoaches = matchedPlan.maxCoaches;
        finalPlanId = matchedPlan.id;
        finalPlanName = matchedPlan.planName;
        finalPlanPrice = price !== undefined ? price : matchedPlan.price;
      } else {
        finalPlanPrice = price;
      }
    }

    const updatedGym = await tx.gym.update({
      where: { id: gymId },
      data: {
        status: 'active',
        subscriptionEnd,
        maxReceptionists,
        maxCoaches,
        planId: finalPlanId,
        planName: finalPlanName,
        planPrice: finalPlanPrice
      }
    });

    // Record Platform Income
    if (finalPrice > 0) {
      await tx.platformFinancialLog.create({
        data: {
          gymId,
          amount: finalPrice,
          description: `تفعيل الاشتراك في باقة: ${finalPlanName || 'باقة مخصصة'} بقيمة ${finalPrice} ج.م لمدة ${planDurationDays} يوم`
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
    include: { gym: { select: { name: true, ownerName: true, email: true, maxReceptionists: true, maxCoaches: true, subscriptionEnd: true } } }
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

// ==========================================
// SAAS PLANS MANAGEMENT
// ==========================================

// ==========================================
// CREATE SAAS PLAN
// ==========================================
exports.createSaasPlan = catchAsync(async (req, res, next) => {
  const { planName, durationInDays, price, description, features, maxReceptionists, maxCoaches } = req.body;

  if (!planName || durationInDays === undefined || price === undefined) {
    return next(new AppError('Please provide planName, durationInDays, and price', 400));
  }

  const newPlan = await prisma.saasPlan.create({
    data: {
      planName,
      durationInDays: parseInt(durationInDays, 10),
      price: parseFloat(price),
      description: description || '',
      features: Array.isArray(features) ? features : [],
      maxReceptionists: maxReceptionists !== undefined ? parseInt(maxReceptionists, 10) : 1,
      maxCoaches: maxCoaches !== undefined ? parseInt(maxCoaches, 10) : 4
    }
  });

  res.status(201).json({
    status: 'success',
    data: { plan: newPlan }
  });
});

// ==========================================
// GET ALL SAAS PLANS
// ==========================================
exports.getSaasPlans = catchAsync(async (req, res, next) => {
  const plans = await prisma.saasPlan.findMany({
    orderBy: { price: 'asc' }
  });

  res.status(200).json({
    status: 'success',
    data: { plans }
  });
});

// ==========================================
// UPDATE SAAS PLAN
// ==========================================
exports.updateSaasPlan = catchAsync(async (req, res, next) => {
  const { planId } = req.params;
  const { planName, durationInDays, price, description, features, maxReceptionists, maxCoaches } = req.body;

  const existing = await prisma.saasPlan.findUnique({ where: { id: planId } });
  if (!existing) {
    return next(new AppError('Plan not found', 404));
  }

  const updated = await prisma.saasPlan.update({
    where: { id: planId },
    data: {
      ...(planName       !== undefined && { planName }),
      ...(durationInDays !== undefined && { durationInDays: parseInt(durationInDays, 10) }),
      ...(price          !== undefined && { price: parseFloat(price) }),
      ...(description    !== undefined && { description }),
      ...(features       !== undefined && { features: Array.isArray(features) ? features : [] }),
      ...(maxReceptionists !== undefined && { maxReceptionists: parseInt(maxReceptionists, 10) }),
      ...(maxCoaches       !== undefined && { maxCoaches: parseInt(maxCoaches, 10) }),
    }
  });

  res.status(200).json({
    status: 'success',
    data: { plan: updated }
  });
});

// ==========================================
// DELETE SAAS PLAN
// ==========================================
exports.deleteSaasPlan = catchAsync(async (req, res, next) => {
  const { planId } = req.params;

  const existing = await prisma.saasPlan.findUnique({ where: { id: planId } });
  if (!existing) {
    return next(new AppError('Plan not found', 404));
  }

  await prisma.saasPlan.delete({ where: { id: planId } });

  res.status(204).json({
    status: 'success',
    data: null
  });
});


// ==========================================
// GYM PROFILES & QUOTAS
// ==========================================

exports.getGymProfile = catchAsync(async (req, res, next) => {
  const { gymId } = req.params;

  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, createdAt: true }
      },
      branches: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!gym) {
    return next(new AppError('Gym not found', 404));
  }

  const staff  = gym.users.filter(u => u.role === 'Receptionist' || u.role === 'Coach');
  const owners = gym.users.filter(u => u.role === 'Gym-Owner');

  res.status(200).json({
    status: 'success',
    data: { gym, owners, staff }
  });
});

// ==========================================
// GET ALL BRANCHES (Admin — across all gyms)
// ==========================================
exports.getAllBranches = catchAsync(async (req, res, next) => {
  const branches = await prisma.branch.findMany({
    orderBy: [
      { status: 'asc' },   // ACTIVE < INACTIVE < PENDING alphabetically — we re-sort on FE
      { createdAt: 'desc' }
    ],
    include: {
      gym: { select: { id: true, gymName: true, name: true, email: true } }
    }
  });

  res.status(200).json({
    status: 'success',
    results: branches.length,
    data: { branches }
  });
});

exports.updateGymQuota = catchAsync(async (req, res, next) => {
  const { gymId } = req.params;
  const { maxReceptionists, maxCoaches } = req.body;

  const gym = await prisma.gym.update({
    where: { id: gymId },
    data: { maxReceptionists, maxCoaches }
  });

  const { logActivity } = require('../utils/activityLogger');
  await logActivity({
    userId: req.user.id,
    gymId: gym.id,
    action: 'UPDATE_QUOTA',
    details: `Updated quotas for ${gym.name}: ${maxReceptionists} Receptionists, ${maxCoaches} Coaches`
  });

  res.status(200).json({
    status: 'success',
    data: { gym }
  });
});

// ==========================================
// ACTIVITY LOGS
// ==========================================

exports.getPlatformActivityLogs = catchAsync(async (req, res, next) => {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, role: true } },
      gym: { select: { name: true } }
    },
    take: 100
  });

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: { logs }
  });
});

// ==========================================
// SAAS PLATFORM EXPENSES
// ==========================================

exports.getPlatformExpenses = catchAsync(async (req, res, next) => {
  const expenses = await prisma.platformExpense.findMany({
    orderBy: { createdAt: 'desc' }
  });

  const totalExpenses = await prisma.platformExpense.aggregate({
    _sum: { amount: true }
  });

  res.status(200).json({
    status: 'success',
    results: expenses.length,
    data: { 
      expenses, 
      totalExpenses: totalExpenses._sum.amount || 0 
    }
  });
});

exports.createPlatformExpense = catchAsync(async (req, res, next) => {
  const { amount, category, description } = req.body;

  if (!amount || !category) {
    return next(new AppError('Please provide amount and category', 400));
  }

  const newExpense = await prisma.platformExpense.create({
    data: {
      amount: parseFloat(amount),
      category,
      description: description || ''
    }
  });

  res.status(201).json({
    status: 'success',
    data: { expense: newExpense }
  });
});

exports.deletePlatformExpense = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const expense = await prisma.platformExpense.findUnique({ where: { id } });
  if (!expense) {
    return next(new AppError('Expense not found', 404));
  }

  await prisma.platformExpense.delete({ where: { id } });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// ==========================================
// PLATFORM SETTINGS (GLOBAL CONFIGURATION)
// ==========================================
exports.getPlatformSettings = catchAsync(async (req, res, next) => {
  let settings = await prisma.platformSettings.findUnique({
    where: { id: 'default' }
  });

  if (!settings) {
    settings = await prisma.platformSettings.create({
      data: { id: 'default' }
    });
  }

  res.status(200).json({
    status: 'success',
    data: { settings }
  });
});

exports.updatePlatformSettings = catchAsync(async (req, res, next) => {
  const allowedFields = [
    'supportEmail', 'supportPhone', 'facebookUrl', 'whatsappUrl',
    'instagramUrl', 'snapchatUrl', 'linkedinUrl', 'showFacebook',
    'showWhatsapp', 'showInstagram', 'showSnapchat', 'showLinkedin',
    'taxNumber', 'commercialRecord', 'showLegalFooter'
  ];

  const updateData = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updateData[key] = req.body[key];
    }
  });

  const updatedSettings = await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: updateData,
    create: { id: 'default', ...updateData }
  });

  res.status(200).json({
    status: 'success',
    data: { settings: updatedSettings }
  });
});

// ==========================================
// APPROVE BRANCH (Super-Admin)
// ==========================================
exports.approveBranch = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const branch = await prisma.branch.findUnique({
    where: { id }
  });

  if (!branch) {
    return next(new AppError('عذراً، لم يتم العثور على الفرع المطلوب.', 404));
  }

  const updatedBranch = await prisma.branch.update({
    where: { id },
    data: { status: 'ACTIVE' }
  });

  res.status(200).json({
    status: 'success',
    message: 'تم تفعيل واعتماد الفرع بنجاح وتشغيله في المنظومة.',
    data: { branch: updatedBranch }
  });
});
