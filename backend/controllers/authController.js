const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const memoryStore = require('../config/memoryStore');

// Helper to safely determine JWT expiration
const getExpiresIn = () => {
  const val = process.env.JWT_EXPIRES_IN;
  if (val && (/^\d+[smhdwqy]$/.test(val) || !isNaN(Number(val)))) {
    return isNaN(Number(val)) ? val : Number(val);
  }
  return '1d';
};

// Helper to generate JWT
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'devsecretjwt_99887755',
    { expiresIn: getExpiresIn() }
  );
};

// Helper to populate department on a memory user
const populateMemoryUser = (u) => {
  if (!u) return null;
  let dept = null;
  if (u.department) {
    const d = memoryStore.departments.find(dep => dep._id.toString() === u.department.toString());
    dept = d ? { _id: d._id, name: d.name } : null;
  }
  return {
    _id: u._id,
    name: u.name,
    email: u.email,
    phone: u.phone || null,
    role: u.role,
    department: dept,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  };
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Strict validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (!email || email.trim() === '') {
      return res.status(400).json({ message: 'Email is required' });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Hash password with cost factor 10
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // SECURITY: Public registration is strictly constrained to citizen role
    const assignedRole = 'citizen';

    if (mongoose.connection.readyState === 1) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(409).json({ message: 'Account already registered with this email address' });
      }

      const user = new User({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone ? phone.trim() : null,
        role: assignedRole,
        department: null
      });

      await user.save();

      const token = generateToken(user._id, user.role);
      return res.status(201).json({
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          department: null
        }
      });
    }

    // In-memory fallback
    const existing = memoryStore.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return res.status(409).json({ message: 'Account already registered with this email address' });
    }

    const newUser = {
      _id: memoryStore.generateId(),
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone ? phone.trim() : null,
      role: assignedRole,
      department: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryStore.users.push(newUser);

    const token = generateToken(newUser._id, newUser.role);
    return res.status(201).json({
      token,
      user: populateMemoryUser(newUser)
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email: normalizedEmail }).populate('department', 'name');
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = generateToken(user._id, user.role);
      return res.json({
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          department: user.department
        }
      });
    }

    // In-memory fallback
    const user = memoryStore.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, user.role);
    return res.json({
      token,
      user: populateMemoryUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get current logged in user details
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user._id || req.user.id)
        .select('-password')
        .populate('department', 'name code');
      if (!user) {
        return res.status(404).json({ message: 'User profile not found' });
      }
      return res.json(user);
    }

    const user = memoryStore.users.find(u => u._id.toString() === req.user._id.toString());
    if (!user) {
      return res.status(404).json({ message: 'User profile not found' });
    }
    res.json(populateMemoryUser(user));
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/auth/users
// @access  Private (Admin)
exports.getUsers = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const users = await User.find()
        .select('-password')
        .populate('department', 'name code')
        .sort({ createdAt: -1 });
      return res.json(users);
    }

    const userList = memoryStore.users
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(populateMemoryUser);
    res.json(userList);
  } catch (error) {
    console.error('GetUsers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user role & department (admin only)
// @route   PUT /api/auth/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res) => {
  try {
    const { role, department } = req.body;
    const allowedRoles = ['citizen', 'officer', 'admin'];

    if (role && !allowedRoles.includes(role.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid role value specified' });
    }

    const normalizedRole = role ? role.toLowerCase() : undefined;

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Safeguard: Prevent demoting the last active administrator
      if (user.role === 'admin' && normalizedRole && normalizedRole !== 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount <= 1) {
          return res.status(400).json({ message: 'Action disallowed: Cannot demote the last administrator' });
        }
      }

      if (normalizedRole) user.role = normalizedRole;

      if (normalizedRole === 'officer') {
        user.department = department || null;
        if (department) {
          await Department.findByIdAndUpdate(department, { $addToSet: { officerIds: user._id } });
        }
      } else {
        if (user.department) {
          await Department.findByIdAndUpdate(user.department, { $pull: { officerIds: user._id } });
        }
        user.department = null;
      }

      await user.save();
      const updatedUser = await User.findById(user._id)
        .select('-password')
        .populate('department', 'name code');
      return res.json(updatedUser);
    }

    // In-memory fallback
    const userIndex = memoryStore.users.findIndex(u => u._id.toString() === req.params.id.toString());
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = memoryStore.users[userIndex];

    // Safeguard: Prevent demoting the last admin in memory
    if (user.role === 'admin' && normalizedRole && normalizedRole !== 'admin') {
      const adminCount = memoryStore.users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Action disallowed: Cannot demote the last administrator' });
      }
    }

    if (normalizedRole) user.role = normalizedRole;

    if (normalizedRole === 'officer') {
      user.department = department || null;
      if (department) {
        const d = memoryStore.departments.find(dep => dep._id.toString() === department.toString());
        if (d && !d.officerIds.includes(user._id)) {
          d.officerIds.push(user._id);
        }
      }
    } else {
      if (user.department) {
        const oldDept = memoryStore.departments.find(dep => dep._id.toString() === user.department.toString());
        if (oldDept) {
          oldDept.officerIds = oldDept.officerIds.filter(id => id.toString() !== user._id.toString());
        }
      }
      user.department = null;
    }
    user.updatedAt = new Date();

    res.json(populateMemoryUser(user));
  } catch (error) {
    console.error('UpdateUser error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Safeguard: Prevent deleting the last administrator
      if (user.role === 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount <= 1) {
          return res.status(400).json({ message: 'Action disallowed: Cannot delete the last administrator' });
        }
      }

      if (user.department) {
        await Department.findByIdAndUpdate(user.department, { $pull: { officerIds: user._id } });
      }

      await user.deleteOne();
      return res.json({ message: 'User deleted successfully' });
    }

    const index = memoryStore.users.findIndex(u => u._id.toString() === req.params.id.toString());
    if (index === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = memoryStore.users[index];

    // Safeguard: Prevent deleting the last administrator
    if (user.role === 'admin') {
      const adminCount = memoryStore.users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Action disallowed: Cannot delete the last administrator' });
      }
    }

    if (user.department) {
      const dept = memoryStore.departments.find(d => d._id.toString() === user.department.toString());
      if (dept) {
        dept.officerIds = dept.officerIds.filter(id => id.toString() !== user._id.toString());
      }
    }
    memoryStore.users.splice(index, 1);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('DeleteUser error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
