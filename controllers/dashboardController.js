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

  res.status(200).json({
    status: 'success',
    data: {
      financials: {
        totalIncome,
        totalExpenses,
        netProfit
      },
      activePlayers,
      liveAttendance
    }
  });
});
