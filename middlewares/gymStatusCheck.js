const prisma = require('../prisma/client');
const catchAsync = require('../utils/catchAsync');

exports.checkGymStatus = catchAsync(async (req, res, next) => {
  // SnapTech admin is not bound to a gym
  if (req.user && req.user.role === 'Platform-Owner') {
    return next();
  }

  // For tenant users
  if (req.user && req.user.gymId) {
    const gym = await prisma.gym.findUnique({ where: { id: req.user.gymId } });
    
    if (!gym) {
      return res.status(404).json({
        status: 'fail',
        message: 'الجيم غير موجود.'
      });
    }

    if (gym.status === 'freeze' || gym.status === 'suspended') {
      return res.status(403).json({
        status: 'fail',
        message: 'عفواً، تم تعليق حساب الجيم مؤقتاً لعدم سداد الاشتراك الدوري، برجاء التواصل مع إدارة منصة Flexora لإعادة التفعيل.'
      });
    }

    if (gym.status === 'pending') {
      return res.status(403).json({
        status: 'fail',
        message: 'عفواً، حساب الجيم لا يزال قيد المراجعة ولم يتم تفعيله بعد.'
      });
    }

    // Check if SaaS subscription expired
    if (gym.subscriptionEnd && new Date() > gym.subscriptionEnd) {
      return res.status(403).json({
        status: 'fail',
        message: 'عفواً، لقد انتهت مدة الاشتراك الخاصة بنظام إدارة الجيم. يرجى التواصل مع إدارة منصة SnapTech لتجديد الاشتراك.'
      });
    }
  }

  next();
});
