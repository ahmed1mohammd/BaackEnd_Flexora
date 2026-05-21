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
      role: { not: 'Platform-Owner' }
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      baseSalary: true,
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

  if (role === 'Platform-Owner') {
    return next(new AppError('Cannot create Platform-Owner from here', 400));
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const newStaff = await prisma.user.create({
    data: {
      gymId: req.user.gymId,
      name,
      email,
      phoneNumber,
      password: hashedPassword,
      role,
      baseSalary: baseSalary || 0
    },
    select: { id: true, name: true, email: true, role: true }
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

  try {
    const updatedStaff = await prisma.user.updateMany({
      where: { 
        id: req.params.id, 
        gymId: req.user.gymId 
      },
      data: { name, phoneNumber, role, baseSalary }
    });

    if (updatedStaff.count === 0) {
      return next(new AppError('No staff found with that ID', 404));
    }

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
