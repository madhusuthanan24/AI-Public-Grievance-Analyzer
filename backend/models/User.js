const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  phone: {
    type: String,
    trim: true,
    default: null
  },
  role: {
    type: String,
    enum: {
      values: ['citizen', 'officer', 'admin', 'CITIZEN', 'OFFICER', 'ADMIN'],
      message: '{VALUE} is not a valid role'
    },
    default: 'citizen',
    set: v => (v ? v.toLowerCase() : 'citizen')
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Compound/Secondary Indexes (email index already created via unique: true)
UserSchema.index({ role: 1 });
UserSchema.index({ department: 1 });

module.exports = mongoose.model('User', UserSchema);
