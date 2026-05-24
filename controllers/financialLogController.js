const prisma = require('../prisma/client');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ==========================================
// GET ALL LOGS
// ==========================================
exports.getAllLogs = catchAsync(async (req, res, next) => {
  const { type } = req.query; // Optional filter: ?type=expense
  
  const whereClause = { gymId: req.user.gymId };
  if (type) whereClause.type = type;

  // Scope to branch if requester is Receptionist or Coach
  if ((req.user.role === 'Receptionist' || req.user.role === 'Coach') && req.user.branchId) {
    whereClause.branchId = req.user.branchId;
  }

  const logs = await prisma.financialLog.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: { logs }
  });
});

// ==========================================
// CREATE EXPENSE
// ==========================================
exports.createExpense = catchAsync(async (req, res, next) => {
  const { category, amount, description } = req.body;

  if (!category || !amount || !description) {
    return next(new AppError('Please provide category, amount, and description', 400));
  }

  // Force type to 'expense', auto-attach branch from logged-in user
  const newExpense = await prisma.financialLog.create({
    data: {
      gymId: req.user.gymId,
      type: 'expense',
      category,
      amount,
      description,
      branchId: req.user.branchId || null
    }
  });

  res.status(201).json({
    status: 'success',
    data: { expense: newExpense }
  });
});

// ==========================================
// DELETE LOG
// ==========================================
exports.deleteLog = catchAsync(async (req, res, next) => {
  const deletedLog = await prisma.financialLog.deleteMany({
    where: { id: req.params.id, gymId: req.user.gymId }
  });

  if (deletedLog.count === 0) {
    return next(new AppError('No log found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});
