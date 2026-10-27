const express = require('express');
const router = express.Router();
const {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departmentController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All department routes require authentication
router.use(auth);

router.route('/')
  .get(roleCheck(['officer', 'admin']), getDepartments)
  .post(roleCheck(['admin']), createDepartment);

router.route('/:id')
  .get(roleCheck(['officer', 'admin']), getDepartmentById)
  .put(roleCheck(['admin']), updateDepartment)
  .delete(roleCheck(['admin']), deleteDepartment);

module.exports = router;
