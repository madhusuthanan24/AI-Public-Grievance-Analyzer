const express = require('express');
const router = express.Router();
const { register, login, getMe, getUsers, updateUser, deleteUser } = require('../controllers/authController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe);

// Admin user management routes
router.get('/users', auth, roleCheck(['admin']), getUsers);
router.put('/users/:id', auth, roleCheck(['admin']), updateUser);
router.delete('/users/:id', auth, roleCheck(['admin']), deleteUser);

module.exports = router;

