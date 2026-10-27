const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Department name is required'],
    unique: true,
    trim: true
  },
  code: {
    type: String,
    uppercase: true,
    trim: true,
    default: function() {
      if (!this.name) return 'DEPT';
      return this.name
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 4)
        .toUpperCase();
    }
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  active: {
    type: Boolean,
    default: true
  },
  officerIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Indexes (name index created via unique: true)
DepartmentSchema.index({ code: 1 });
DepartmentSchema.index({ active: 1 });

module.exports = mongoose.model('Department', DepartmentSchema);
