const express = require('express');
const router = express.Router();
const { getSummary } = require('../controllers/analyticsController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Analytics routes require authentication and admin access
router.get('/summary', auth, roleCheck(['admin']), getSummary);

module.exports = router;
