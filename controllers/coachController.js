const prisma = require('../prisma/client');
const catchAsync = require('../utils/catchAsync');

// ==========================================
// GET COACH DASHBOARD
// ==========================================
exports.getCoachDashboard = catchAsync(async (req, res, next) => {
  const coachId = req.user.id;
  const gymId = req.user.gymId;

  // 1. List of assigned private clients
  const privateClients = await prisma.member.findMany({
    where: {
      gymId,
      coachId,
      trainingType: 'Private'
    },
    select: {
      name: true,
      phoneNumber: true,
      status: true,
      subscriptionEnd: true
    }
  });

  // 2. Count active assigned clients
  const activeClientsCount = privateClients.filter(c => c.status === 'active').length;

  // 3. Coach Earnings = baseSalary * activeClientsCount
  const coachEarnings = (req.user.baseSalary || 0) * activeClientsCount;

  res.status(200).json({
    status: 'success',
    data: {
      coachEarnings,
      activeClientsCount,
      totalClientsCount: privateClients.length,
      privateClients
    }
  });
});
