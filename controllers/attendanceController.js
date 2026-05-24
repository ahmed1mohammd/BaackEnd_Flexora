const prisma = require('../prisma/client');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ==========================================
// CHECK IN
// ==========================================
exports.checkIn = catchAsync(async (req, res, next) => {
  const { qrCode } = req.body;

  if (!qrCode) {
    return next(new AppError('يرجى تقديم رمز الهوية الرقمية (QR) للتحقق.', 400));
  }

  // 1. Find the member
  const member = await prisma.member.findUnique({
    where: { qrCode }
  });

  if (!member) {
    return next(new AppError('رمز الهوية الرقمية (QR) غير مسجل أو غير صحيح. يرجى مسح الرمز مجدداً.', 404));
  }

  // 2. Security Check: Same Gym?
  if (member.gymId !== req.user.gymId) {
    return next(new AppError('عذراً، هذا المشترك غير تابع لهذه الصالة الرياضية.', 403));
  }

  // 3. Status Check
  if (member.status === 'frozen') {
    return res.status(403).json({
      status: 'fail',
      message: `عذراً، حالة العضو الحالية [${member.name}] هي: مجمد مؤقتاً. يرجى مراجعة موظف الاستقبال.`
    });
  }

  if (member.status === 'expired' || (member.subscriptionEnd && new Date(member.subscriptionEnd) < new Date())) {
    if (member.status === 'active') {
      // Auto expire in db
      await prisma.member.update({
        where: { id: member.id },
        data: { status: 'expired' }
      });
    }
    return res.status(403).json({
      status: 'fail',
      message: `عذراً، اشتراك العضو [${member.name}] منتهي الصلاحية. يرجى التوجه للاستقبال للتجديد.`
    });
  }

  if (member.status !== 'active') {
    return res.status(403).json({
      status: 'fail',
      message: `عذراً، حالة الاشتراك الخاصة باللاعب [${member.name}] هي: غير نشط.`
    });
  }

  // 3.5. Prevent duplicate attendance check-in for the same day
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const existingAttendance = await prisma.attendance.findFirst({
    where: {
      memberId: member.id,
      checkInTime: {
        gte: todayStart,
        lte: todayEnd
      }
    }
  });

  if (existingAttendance) {
    return res.status(400).json({
      status: 'fail',
      message: `عذراً، لقد تم تسجيل حضور اللاعب [${member.name}] اليوم بالفعل ولا يمكن تسجيله مجدداً في نفس اليوم.`
    });
  }

  // 4. Record Attendance with branchId
  const attendance = await prisma.attendance.create({
    data: {
      gymId: member.gymId,
      memberId: member.id,
      branchId: req.user.branchId || null
    },
    include: {
      member: {
        select: {
          name: true,
          activePackage: { select: { name: true } }
        }
      }
    }
  });

  res.status(200).json({
    status: 'success',
    message: `مرحباً بك كابتن ${member.name}! تم تسجيل الحضور بنجاح. تفضل بالدخول.`,
    data: { attendance }
  });
});
