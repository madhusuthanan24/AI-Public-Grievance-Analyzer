const mongoose = require('mongoose');
const Department = require('../models/Department');
const User = require('../models/User');
const memoryStore = require('../config/memoryStore');

const populateMemoryDepartment = (dept) => {
  if (!dept) return null;
  // Match officers either via officerIds array or where u.department matches dept._id and u.role === 'officer'
  const officers = memoryStore.users
    .filter(u => {
      const isRoleOfficer = (u.role || '').toLowerCase() === 'officer';
      if (!isRoleOfficer) return false;
      const inArray = dept.officerIds && dept.officerIds.some(oid => oid.toString() === u._id.toString());
      const inUserDept = u.department && (u.department._id || u.department).toString() === dept._id.toString();
      return inArray || inUserDept;
    })
    .map(u => ({ _id: u._id, name: u.name, email: u.email }));

  return {
    _id: dept._id,
    name: dept.name,
    code: dept.code,
    description: dept.description,
    active: dept.active !== false,
    officerIds: officers,
    createdAt: dept.createdAt,
    updatedAt: dept.updatedAt
  };
};

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private (Officer/Admin)
exports.getDepartments = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const departments = await Department.find().populate('officerIds', 'name email');
      return res.json(departments);
    }

    const depts = memoryStore.departments.map(populateMemoryDepartment);
    res.json(depts);
  } catch (error) {
    console.error('getDepartments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get department by ID
// @route   GET /api/departments/:id
// @access  Private (Officer/Admin)
exports.getDepartmentById = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const department = await Department.findById(req.params.id).populate('officerIds', 'name email');
      if (!department) {
        return res.status(404).json({ message: 'Department not found' });
      }
      return res.json(department);
    }

    const dept = memoryStore.departments.find(d => d._id.toString() === req.params.id.toString());
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }
    res.json(populateMemoryDepartment(dept));
  } catch (error) {
    console.error('getDepartmentById error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new department
// @route   POST /api/departments
// @access  Private (Admin)
exports.createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }

    if (mongoose.connection.readyState === 1) {
      let department = await Department.findOne({ name });
      if (department) {
        return res.status(400).json({ message: 'Department with that name already exists' });
      }

      department = new Department({ name, description });
      await department.save();
      return res.status(201).json(department);
    }

    const existing = memoryStore.departments.find(d => d.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      return res.status(400).json({ message: 'Department with that name already exists' });
    }

    const newDept = {
      _id: memoryStore.generateId(),
      name,
      description,
      officerIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryStore.departments.push(newDept);

    res.status(201).json(populateMemoryDepartment(newDept));
  } catch (error) {
    console.error('createDepartment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private (Admin)
exports.updateDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (mongoose.connection.readyState === 1) {
      let department = await Department.findById(req.params.id);
      if (!department) {
        return res.status(404).json({ message: 'Department not found' });
      }

      department.name = name || department.name;
      department.description = description || department.description;

      await department.save();
      return res.json(department);
    }

    const dept = memoryStore.departments.find(d => d._id.toString() === req.params.id.toString());
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    if (name) dept.name = name;
    if (description) dept.description = description;
    dept.updatedAt = new Date();

    res.json(populateMemoryDepartment(dept));
  } catch (error) {
    console.error('updateDepartment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private (Admin)
exports.deleteDepartment = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const department = await Department.findById(req.params.id);
      if (!department) {
        return res.status(404).json({ message: 'Department not found' });
      }

      await User.updateMany({ department: req.params.id }, { department: null });
      await department.deleteOne();
      return res.json({ message: 'Department removed' });
    }

    const index = memoryStore.departments.findIndex(d => d._id.toString() === req.params.id.toString());
    if (index === -1) {
      return res.status(404).json({ message: 'Department not found' });
    }

    memoryStore.departments.splice(index, 1);
    memoryStore.users.forEach(u => {
      if (u.department && u.department.toString() === req.params.id.toString()) {
        u.department = null;
      }
    });

    res.json({ message: 'Department removed' });
  } catch (error) {
    console.error('deleteDepartment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
