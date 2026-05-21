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

const router = express.Router();

// Public Routes

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
router.use('/staff', authMiddleware.restrictTo('Gym-Owner'));

// ==========================================
// ROUTE: /STAFF
// ==========================================
router.route('/staff')
  .get(staffController.getAllStaff)
  .post(staffController.createStaff);

// ==========================================
// ROUTE: /STAFF/:ID
// ==========================================
router.route('/staff/:id')
  .put(staffController.updateStaff)
  .delete(staffController.deleteStaff);

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
// ROUTE: /ATTENDANCE/CHECK
// ==========================================
router.post('/attendance/check', authMiddleware.restrictTo('Gym-Owner', 'Receptionist', 'Coach'), attendanceController.checkIn);

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
