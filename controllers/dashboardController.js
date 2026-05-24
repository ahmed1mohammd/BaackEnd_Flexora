const prisma = require('../prisma/client');
const catchAsync = require('../utils/catchAsync');

// ==========================================
// GET STATS
// ==========================================
exports.getStats = catchAsync(async (req, res, next) => {
  const gymId = req.user.gymId;

  // 1. Complex Aggregation for Financials using Prisma groupBy
  const financials = await prisma.financialLog.groupBy({
    by: ['type'],
    where: { gymId },
    _sum: {
      amount: true
    }
  });

  let totalIncome = 0;
  let totalExpenses = 0;

  financials.forEach(item => {
    if (item.type === 'income') totalIncome += item._sum.amount || 0;
    if (item.type === 'expense') totalExpenses += item._sum.amount || 0;
  });

  const netProfit = totalIncome - totalExpenses;

  // 2. Active Players
  const activePlayers = await prisma.member.count({
    where: {
      gymId,
      status: 'active'
    }
  });

  // 3. Live Attendance (Checked in today)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const liveAttendance = await prisma.attendance.count({
    where: {
      gymId,
      checkInTime: { gte: startOfDay }
    }
  });

  // 4. Branch Breakdown Calculations
  const branches = await prisma.branch.findMany({
    where: { gymId, status: 'ACTIVE' }
  });

  const branchBreakdown = [];

  // Main branch breakdown (where branchId is null)
  const mainIncomeGroup = await prisma.financialLog.aggregate({
    _sum: { amount: true },
    where: { gymId, type: 'income', branchId: null }
  });
  const mainExpenseGroup = await prisma.financialLog.aggregate({
    _sum: { amount: true },
    where: { gymId, type: 'expense', branchId: null }
  });
  const mainActivePlayers = await prisma.member.count({
    where: { gymId, status: 'active', branchId: null }
  });

  branchBreakdown.push({
    id: 'none',
    name: 'الفرع الرئيسي',
    totalIncome: mainIncomeGroup._sum.amount || 0,
    totalExpenses: mainExpenseGroup._sum.amount || 0,
    netProfit: (mainIncomeGroup._sum.amount || 0) - (mainExpenseGroup._sum.amount || 0),
    activePlayers: mainActivePlayers
  });

  // Each individual branch breakdown
  for (const branch of branches) {
    const incomeGroup = await prisma.financialLog.aggregate({
      _sum: { amount: true },
      where: { gymId, type: 'income', branchId: branch.id }
    });
    const expenseGroup = await prisma.financialLog.aggregate({
      _sum: { amount: true },
      where: { gymId, type: 'expense', branchId: branch.id }
    });
    const activePlayersCount = await prisma.member.count({
      where: { gymId, status: 'active', branchId: branch.id }
    });

    branchBreakdown.push({
      id: branch.id,
      name: branch.name,
      totalIncome: incomeGroup._sum.amount || 0,
      totalExpenses: expenseGroup._sum.amount || 0,
      netProfit: (incomeGroup._sum.amount || 0) - (expenseGroup._sum.amount || 0),
      activePlayers: activePlayersCount
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      financials: {
        totalIncome,
        totalExpenses,
        netProfit
      },
      activePlayers,
      liveAttendance,
      branchBreakdown
    }
  });
});
