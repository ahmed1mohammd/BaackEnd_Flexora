const express = require('express');
const branchController = require('../controllers/branchController');
const authMiddleware = require('../middlewares/authMiddleware');
const gymStatusCheck = require('../middlewares/gymStatusCheck');

const router = express.Router();

// Protect all gym branch routes
router.use(authMiddleware.protect);
router.use(gymStatusCheck.checkGymStatus);

// ==========================================
// REQUEST BRANCH: POST /gym/request-branch
// ==========================================
router.post('/request-branch', authMiddleware.restrictTo('Gym-Owner'), branchController.requestBranch);

// ==========================================
// GET ALL BRANCHES: GET /gym/branches
// ==========================================
router.get('/branches', authMiddleware.restrictTo('Gym-Owner', 'Receptionist', 'Coach'), branchController.getAllBranches);

module.exports = router;
