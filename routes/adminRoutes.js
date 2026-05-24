const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Admin Authentication

// ==========================================
// ROUTE: /LOGIN
// ==========================================
router.post('/login', adminController.adminLogin);

// ==========================================
// ROUTE: GET /saas-plans (Public)
// ==========================================
router.get('/saas-plans', adminController.getSaasPlans);

// Protect all admin routes below this middleware
router.use(authMiddleware.protect);

// Routes accessible by both Owner and Manager
const allowBoth = authMiddleware.restrictTo('Platform-Owner', 'Platform-Manager');
const onlyOwner = authMiddleware.restrictTo('Platform-Owner');

// ==========================================
// TEAM MANAGEMENT (Owner Only)
// ==========================================
router.route('/team')
  .get(onlyOwner, adminController.getPlatformTeam)
  .post(onlyOwner, adminController.createPlatformMember);

router.delete('/team/:id', onlyOwner, adminController.deletePlatformMember);

// ==========================================
// SAAS PLANS MANAGEMENT
// ==========================================
router.post('/saas-plans', onlyOwner, adminController.createSaasPlan);
router.put('/saas-plans/:planId', onlyOwner, adminController.updateSaasPlan);
router.delete('/saas-plans/:planId', onlyOwner, adminController.deleteSaasPlan);

// ==========================================
// SETTINGS
// ==========================================
router.put('/settings/password', allowBoth, adminController.updatePassword);
router.route('/settings/platform')
  .get(allowBoth, adminController.getPlatformSettings)
  .put(onlyOwner, adminController.updatePlatformSettings);

// ==========================================
// DASHBOARD
// ==========================================
router.get('/dashboard', allowBoth, adminController.getPlatformDashboard);

// ==========================================
// GYM MANAGEMENT
// ==========================================
router.route('/gyms')
  .get(allowBoth, adminController.getAllGyms);

router.put('/gyms/:gymId/activate', allowBoth, adminController.activateGym);
router.put('/gyms/:gymId/freeze', allowBoth, adminController.freezeGym);
router.put('/gyms/:gymId/suspend', allowBoth, adminController.suspendGym);

router.route('/gyms/:gymId/profile')
  .get(allowBoth, adminController.getGymProfile);

router.put('/gyms/:gymId/quota', onlyOwner, adminController.updateGymQuota);

router.route('/gyms/:gymId')
  .delete(onlyOwner, adminController.deleteGym);

// ==========================================
// ACTIVITY LOGS
// ==========================================
router.get('/activity', onlyOwner, adminController.getPlatformActivityLogs);

// ==========================================
// SAAS PLATFORM EXPENSES
// ==========================================
router.route('/expenses')
  .get(allowBoth, adminController.getPlatformExpenses)
  .post(allowBoth, adminController.createPlatformExpense);

router.delete('/expenses/:id', onlyOwner, adminController.deletePlatformExpense);

// ==========================================
// APPROVE BRANCH
// ==========================================
router.put('/branches/:id/approve', allowBoth, adminController.approveBranch);

module.exports = router;
