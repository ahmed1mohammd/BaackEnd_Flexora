const bcrypt = require('bcryptjs');
const prisma = require('../prisma/client');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ==========================================
// GET ALL STAFF
// ==========================================
exports.getAllStaff = catchAsync(async (req, res, next) => {
  const staff = await prisma.user.findMany({
    where: { 
      gymId: req.user.gymId,
      role: { in: ['Coach', 'Receptionist'] }
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      baseSalary: true,
      branchId: true,
      createdAt: true
    }
  });

  res.status(200).json({
    status: 'success',
    results: staff.length,
    data: { staff }
  });
});

// ==========================================
// CREATE STAFF
// ==========================================
exports.createStaff = catchAsync(async (req, res, next) => {
  const { name, email, phoneNumber, password, role, baseSalary } = req.body;
  const gymId = req.user.gymId;

  if (role === 'Platform-Owner') {
    return next(new AppError('Cannot create Platform-Owner from here', 400));
  }

  // Check if email already exists in system
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return next(new AppError('عذراً، هذا البريد الإلكتروني مسجل بالفعل لمستخدم آخر في النظام. يرجى استخدام بريد إلكتروني مختلف.', 400));
  }

  // Get Gym quotas
  const gym = await prisma.gym.findUnique({
    where: { id: gymId }
  });

  if (!gym) {
    return next(new AppError('Gym not found', 404));
  }

  // Count existing staff of the same role
  const count = await prisma.user.count({
    where: {
      gymId,
      role
    }
  });

  // Enforce receptionist quota
  if (role === 'Receptionist' && count >= (gym.maxReceptionists || 1)) {
    return next(new AppError('عفواً، لقد تجاوزت الحد الأقصى للموظفين المتاح في باقتك الحالية. يرجى ترقية الاشتراك.', 400));
  }

  // Enforce coach quota
  if (role === 'Coach' && count >= (gym.maxCoaches || 4)) {
    return next(new AppError('عفواً، لقد تجاوزت الحد الأقصى للموظفين المتاح في باقتك الحالية. يرجى ترقية الاشتراك.', 400));
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const newStaff = await prisma.user.create({
    data: {
      gymId,
      name,
      email,
      phoneNumber,
      password: hashedPassword,
      role,
      baseSalary: baseSalary || 0,
      branchId: req.body.branchId || null
    },
    select: { id: true, name: true, email: true, role: true, branchId: true }
  });

  res.status(201).json({
    status: 'success',
    data: { staff: newStaff }
  });
});

// ==========================================
// UPDATE STAFF
// ==========================================
exports.updateStaff = catchAsync(async (req, res, next) => {
  const { name, phoneNumber, role, baseSalary } = req.body;
  const gymId = req.user.gymId;

  try {
    // 1. Get current staff member
    const currentStaff = await prisma.user.findFirst({
      where: { 
        id: req.params.id, 
        gymId 
      }
    });

    if (!currentStaff) {
      return next(new AppError('No staff found with that ID', 404));
    }

    // 2. If role changed, enforce quotas
    if (role && role !== currentStaff.role) {
      const gym = await prisma.gym.findUnique({
        where: { id: gymId }
      });
      if (!gym) {
        return next(new AppError('Gym not found', 404));
      }

      const count = await prisma.user.count({
        where: {
          gymId,
          role
        }
      });

      if (role === 'Receptionist' && count >= (gym.maxReceptionists || 1)) {
        return next(new AppError('عفواً، لقد تجاوزت الحد الأقصى للموظفين المتاح في باقتك الحالية. يرجى ترقية الاشتراك.', 400));
      }

      if (role === 'Coach' && count >= (gym.maxCoaches || 4)) {
        return next(new AppError('عفواً، لقد تجاوزت الحد الأقصى للموظفين المتاح في باقتك الحالية. يرجى ترقية الاشتراك.', 400));
      }
    }

    const updatedStaff = await prisma.user.updateMany({
      where: { 
        id: req.params.id, 
        gymId 
      },
      data: { 
        name, 
        phoneNumber, 
        role, 
        baseSalary,
        branchId: req.body.branchId !== undefined ? (req.body.branchId === 'none' || req.body.branchId === '' ? null : req.body.branchId) : undefined
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Staff updated successfully'
    });
  } catch (error) {
    return next(new AppError('Error updating staff', 500));
  }
});

// ==========================================
// DELETE STAFF
// ==========================================
exports.deleteStaff = catchAsync(async (req, res, next) => {
  const deletedStaff = await prisma.user.deleteMany({
    where: {
      id: req.params.id,
      gymId: req.user.gymId
    }
  });

  if (deletedStaff.count === 0) {
    return next(new AppError('No staff found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});
