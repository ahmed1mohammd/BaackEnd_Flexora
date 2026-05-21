const prisma = require('../prisma/client');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ==========================================
// CHECK IN
// ==========================================
exports.checkIn = catchAsync(async (req, res, next) => {
  const { qrCode } = req.body;

  if (!qrCode) {
    return next(new AppError('Please provide a QR Code', 400));
  }

  // 1. Find the member
  const member = await prisma.member.findUnique({
    where: { qrCode }
  });

  if (!member) {
    return next(new AppError('Invalid QR Code. Member not found.', 404));
  }

  // 2. Security Check: Same Gym?
  if (member.gymId !== req.user.gymId) {
    return next(new AppError('Unauthorized. This member belongs to another gym.', 403));
  }

  // 3. Status Check
  if (member.status !== 'active') {
    return res.status(403).json({
      status: 'fail',
      message: `Access Denied. Member status is ${member.status}.`
    });
  }

  // 4. Record Attendance
  const attendance = await prisma.attendance.create({
    data: {
      gymId: member.gymId,
      memberId: member.id
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Check-in successful',
    data: { attendance }
  });
});
