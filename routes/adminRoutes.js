const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Admin Authentication

// ==========================================
// ROUTE: /LOGIN
// ==========================================
router.post('/login', adminController.adminLogin);

// Protect all admin routes below this middleware
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('Platform-Owner'));

// Admin Dashboard

// ==========================================
// ROUTE: /DASHBOARD
// ==========================================
router.get('/dashboard', adminController.getPlatformDashboard);

// Admin Gym Management

// ==========================================
// ROUTE: /GYMS
// ==========================================
router.route('/gyms')
  .get(adminController.getAllGyms);


// ==========================================
// ROUTE: /GYMS/:GYMID/ACTIVATE
// ==========================================
router.put('/gyms/:gymId/activate', adminController.activateGym);

// ==========================================
// ROUTE: /GYMS/:GYMID/FREEZE
// ==========================================
router.put('/gyms/:gymId/freeze', adminController.freezeGym);

// ==========================================
// ROUTE: /GYMS/:GYMID/SUSPEND
// ==========================================
router.put('/gyms/:gymId/suspend', adminController.suspendGym);


// ==========================================
// ROUTE: /GYMS/:GYMID
// ==========================================
router.route('/gyms/:gymId')
  .delete(adminController.deleteGym);

module.exports = router;
