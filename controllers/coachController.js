const prisma = require('../prisma/client');
const catchAsync = require('../utils/catchAsync');

// ==========================================
// GET COACH DASHBOARD
// ==========================================
exports.getCoachDashboard = catchAsync(async (req, res, next) => {
  const coachId = req.user.id;
  const gymId = req.user.gymId;

  // 1. Fetch private clients with packages and attendances
  const privateClients = await prisma.member.findMany({
    where: {
      gymId,
      coachId,
      trainingType: 'Private'
    },
    include: {
      activePackage: { select: { name: true } },
      attendances: { select: { checkInTime: true } }
    }
  });

  const formattedClients = privateClients.map(m => {
    const attendedDays = m.attendances.length;
    
    // Days since member registration
    const diffTime = Math.max(0, Date.now() - new Date(m.createdAt).getTime());
    const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    const absentDays = Math.max(0, daysPassed - attendedDays);
    const commitmentRate = Math.min(100, Math.round((attendedDays / Math.max(1, daysPassed)) * 100));

    return {
      id: m.id,
      name: m.name,
      phoneNumber: m.phoneNumber,
      status: m.status,
      subscriptionEnd: m.subscriptionEnd,
      createdAt: m.createdAt,
      packageName: m.activePackage?.name || 'باقة مخصصة',
      attendedDays,
      absentDays,
      commitmentRate
    };
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
      privateClients: formattedClients
    }
  });
});
