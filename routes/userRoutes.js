const express = require('express');
const authController = require('../controllers/authController');
const staffController = require('../controllers/staffController');
const memberController = require('../controllers/memberController');
const attendanceController = require('../controllers/attendanceController');
const dashboardController = require('../controllers/dashboardController');
const coachController = require('../controllers/coachController');
const authMiddleware = require('../middlewares/authMiddleware');
const gymStatusCheck = require('../middlewares/gymStatusCheck');
const packageController = require('../controllers/packageController');
const prisma = require('../prisma/client');

const router = express.Router();

// Public Routes

// ==========================================
// ROUTE: /PLANS (Public SaaS Subscription Plans)
// ==========================================
router.get('/plans', async (req, res) => {
  try {
    const dbPlans = await prisma.saasPlan.findMany({
      orderBy: { price: 'asc' }
    });
    
    if (dbPlans && dbPlans.length > 0) {
      // Map database schema fields to response fields
      const plans = dbPlans.map(plan => ({
        id: plan.id,
        name: plan.planName,
        planName: plan.planName,
        durationInDays: plan.durationInDays,
        price: plan.price,
        description: plan.description || '',
        features: plan.features || []
      }));
      
      return res.status(200).json({
        status: 'success',
        data: { plans }
      });
    }
  } catch (error) {
    console.error('Error fetching plans from DB:', error.message);
  }
  
  // Fallback if DB query fails or has no plans
  res.status(200).json({
    status: 'success',
    data: {
      plans: [
        { 
          id: 'tier1', 
          name: 'الباقة الأساسية (1 شهر)', 
          durationInDays: 30, 
          price: 500, 
          description: 'الباقة الأساسية',
          features: [
            'أتمتة ملفات واشتراكات الأعضاء الأساسية',
            'توليد وتشفير كود الدخول الرقمي (QR)',
            'صلاحية وصول لواجهة استقبال واحدة (Reception Desk)'
          ]
        },
        { 
          id: 'tier2', 
          name: 'الباقة المتقدمة (3 أشهر) — الأكثر طلباً', 
          durationInDays: 90, 
          price: 1200, 
          description: 'الباقة المتقدمة', 
          features: [
            'توفير مالي بمعدل 20% مقارنة بالدفع الشهري',
            'لوحة التقارير المالية والإحصائيات التحليلية',
            'توليد وطباعة بطاقات العضوية المشفرة (CR80)',
            'صلاحيات منفصلة للإدارة العليا وطاقم الاستقبال'
          ]
        },
        { 
          id: 'tier3', 
          name: 'الباقة الاحترافية (6 أشهر)', 
          durationInDays: 180, 
          price: 2200, 
          description: 'الباقة الاحترافية', 
          features: [
            'توفير مالي بمعدل 27% مقارنة بالدفع الشهري',
            'تفعيل محرك المحاسبة المالي الموحد V2 بالكامل',
            'ربط بوابات الحضور الإلكترونية الذكية بشكل غير محدود',
            'دعم فني مخصص وخط ساخن للاستشارات التقنية'
          ]
        },
        { 
          id: 'tier4', 
          name: 'منظومة الأعمال الشاملة (سنة كاملة) — أفضل قيمة', 
          durationInDays: 365, 
          price: 4000, 
          description: 'منظومة الأعمال الشاملة', 
          features: [
            'توفير استثنائي بمعدل 33% من القيمة الإجمالية',
            'إدارة وحسابات فروع متعددة ومنفصلة (Multi-Branch Core)',
            'تصدير فوري لكافة التقارير المالية والمحاسبية لملفات Excel/PDF',
            'أولوية قصوى في الدعم التقني وجلسات استشارية لتطوير الأعمال'
          ]
        }
      ]
    }
  });
});

// ==========================================
// ROUTE: /REGISTER
// ==========================================
router.post('/register', authController.register);

// ==========================================
// ROUTE: /LOGIN
// ==========================================
router.post('/login', authController.login);

// Protect all routes below
router.use(authMiddleware.protect);
router.use(gymStatusCheck.checkGymStatus);

// V2 Dashboards

// ==========================================
// ROUTE: /DASHBOARD/STATS
// ==========================================
router.get('/dashboard/stats', authMiddleware.restrictTo('Gym-Owner'), dashboardController.getStats);

// ==========================================
// ROUTE: /COACH/DASHBOARD
// ==========================================
router.get('/coach/dashboard', authMiddleware.restrictTo('Coach'), coachController.getCoachDashboard);

// Packages Management

// ==========================================
// ROUTE: /PACKAGES
// ==========================================
router.route('/packages')
  .get(authMiddleware.restrictTo('Gym-Owner', 'Receptionist'), packageController.getAllPackages)
  .post(authMiddleware.restrictTo('Gym-Owner'), packageController.createPackage);

// ==========================================
// ROUTE: /PACKAGES/:ID
// ==========================================
router.route('/packages/:id')
  .put(authMiddleware.restrictTo('Gym-Owner'), packageController.updatePackage)
  .delete(authMiddleware.restrictTo('Gym-Owner'), packageController.deletePackage);

// Staff Management
// ==========================================
// ROUTE: /STAFF
// ==========================================
router.route('/staff')
  .get(authMiddleware.restrictTo('Gym-Owner', 'Receptionist'), staffController.getAllStaff)
  .post(authMiddleware.restrictTo('Gym-Owner'), staffController.createStaff);

// ==========================================
// ROUTE: /STAFF/:ID
// ==========================================
router.route('/staff/:id')
  .put(authMiddleware.restrictTo('Gym-Owner'), staffController.updateStaff)
  .delete(authMiddleware.restrictTo('Gym-Owner'), staffController.deleteStaff);

// Member Management

// ==========================================
// ROUTE: /MEMBERS
// ==========================================
router.route('/members')
  .get(authMiddleware.restrictTo('Gym-Owner', 'Receptionist', 'Coach'), memberController.getAllMembers)
  .post(authMiddleware.restrictTo('Gym-Owner', 'Receptionist'), memberController.createMember);

// ==========================================
// ROUTE: /MEMBERS/:ID
// ==========================================
router.route('/members/:id')
  .put(authMiddleware.restrictTo('Gym-Owner', 'Receptionist'), memberController.updateMember)
  .delete(authMiddleware.restrictTo('Gym-Owner', 'Receptionist'), memberController.deleteMember);

// Attendance

// ==========================================
// ROUTE: /ATTENDANCE/CHECK & /ATTENDANCE/CHECK-IN
// ==========================================
router.post('/attendance/check', authMiddleware.restrictTo('Gym-Owner', 'Receptionist', 'Coach'), attendanceController.checkIn);
router.post('/attendance/check-in', authMiddleware.restrictTo('Gym-Owner', 'Receptionist', 'Coach'), attendanceController.checkIn);

// Financials (Expenses)
const financialLogController = require('../controllers/financialLogController');

// ==========================================
// ROUTE: /FINANCIALS
// ==========================================
router.route('/financials')
  .get(authMiddleware.restrictTo('Gym-Owner'), financialLogController.getAllLogs)
  .post(authMiddleware.restrictTo('Gym-Owner', 'Receptionist'), financialLogController.createExpense);


// ==========================================
// ROUTE: /FINANCIALS/:ID
// ==========================================
router.route('/financials/:id')
  .delete(authMiddleware.restrictTo('Gym-Owner'), financialLogController.deleteLog);

module.exports = router;
