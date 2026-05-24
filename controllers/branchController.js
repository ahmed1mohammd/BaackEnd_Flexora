const prisma = require('../prisma/client');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ==========================================
// REQUEST NEW BRANCH (Gym Owner)
// ==========================================
exports.requestBranch = catchAsync(async (req, res, next) => {
  const { name, address } = req.body;
  const gymId = req.user.gymId;

  if (!name) {
    return next(new AppError('يرجى تقديم اسم الفرع المطلوب تسجيله.', 400));
  }

  // Create the branch with PENDING status
  const newBranch = await prisma.branch.create({
    data: {
      gymId,
      name,
      address: address || '',
      status: 'PENDING'
    }
  });

  res.status(201).json({
    status: 'success',
    message: 'تم تقديم طلب إضافة الفرع بنجاح، وهو قيد المراجعة الإدارية والمالية الآن.',
    data: { branch: newBranch }
  });
});

// ==========================================
// GET ALL GYM BRANCHES (Owner, Receptionist, Coach)
// ==========================================
exports.getAllBranches = catchAsync(async (req, res, next) => {
  const gymId = req.user.gymId;

  const branches = await prisma.branch.findMany({
    where: { gymId },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({
    status: 'success',
    results: branches.length,
    data: { branches }
  });
});
