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
      // Return all plan fields including quota limits
      const plans = dbPlans.map(plan => ({
        id: plan.id,
        name: plan.planName,
        planName: plan.planName,
        durationInDays: plan.durationInDays,
        price: plan.price,
        description: plan.description || '',
        features: plan.features || [],
        maxReceptionists: plan.maxReceptionists ?? 1,
        maxCoaches: plan.maxCoaches ?? 4,
      }));
      
      return res.status(200).json({
        status: 'success',
        data: { plans }
      });
    }

    // No plans in DB yet
    return res.status(200).json({
      status: 'success',
      data: { plans: [] }
    });
  } catch (error) {
    console.error('Error fetching plans from DB:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'فشل تحميل خطط الاشتراك من الخادم. يرجى المحاولة لاحقاً.'
    });
  }
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
