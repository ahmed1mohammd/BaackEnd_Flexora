const prisma = require('../prisma/client');

/**
 * دالة مساعدة لتسجيل النشاطات في المنظومة أو داخل الأندية.
 * 
 * @param {Object} params - تفاصيل النشاط
 * @param {string} params.userId - معرف المستخدم الذي قام بالإجراء (مثلاً: Admin, GymOwner, Receptionist)
 * @param {string} [params.gymId] - معرف الصالة (إذا كان النشاط يخص صالة محددة، اتركه فارغاً للنشاطات الإدارية العامة للـ SaaS)
 * @param {string} params.action - نوع الحركة (مثال: 'UPDATE_QUOTA', 'CREATE_MEMBER', 'ACTIVATE_GYM')
 * @param {string} params.details - تفاصيل نصية مقروءة للحركة
 */
exports.logActivity = async ({ userId, gymId = null, action, details }) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        gymId,
        action,
        details
      }
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
    // عدم رمي الخطأ حتى لا يتعطل الـ API الأساسي في حالة فشل التسجيل
  }
};
