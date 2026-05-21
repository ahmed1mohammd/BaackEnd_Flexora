const prisma = require('../prisma/client');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ==========================================
// GET ALL PACKAGES
// ==========================================
exports.getAllPackages = catchAsync(async (req, res, next) => {
  const packages = await prisma.package.findMany({
    where: { gymId: req.user.gymId }
  });

  res.status(200).json({
    status: 'success',
    results: packages.length,
    data: { packages }
  });
});

// ==========================================
// CREATE PACKAGE
// ==========================================
exports.createPackage = catchAsync(async (req, res, next) => {
  const { name, durationInDays, price, type } = req.body;

  const newPackage = await prisma.package.create({
    data: {
      gymId: req.user.gymId,
      name,
      durationInDays,
      price,
      type
    }
  });

  res.status(201).json({
    status: 'success',
    data: { package: newPackage }
  });
});

// ==========================================
// UPDATE PACKAGE
// ==========================================
exports.updatePackage = catchAsync(async (req, res, next) => {
  const { name, durationInDays, price, type } = req.body;

  const updatedPackage = await prisma.package.updateMany({
    where: { id: req.params.id, gymId: req.user.gymId },
    data: { name, durationInDays, price, type }
  });

  if (updatedPackage.count === 0) {
    return next(new AppError('No package found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Package updated successfully'
  });
});

// ==========================================
// DELETE PACKAGE
// ==========================================
exports.deletePackage = catchAsync(async (req, res, next) => {
  const deletedPackage = await prisma.package.deleteMany({
    where: { id: req.params.id, gymId: req.user.gymId }
  });

  if (deletedPackage.count === 0) {
    return next(new AppError('No package found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});
