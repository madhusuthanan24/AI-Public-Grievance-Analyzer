const mongoose = require('mongoose');

const GrievanceHistorySchema = new mongoose.Schema({
  grievanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true
  },
  status: {
    type: String,
    required: true
  },
  remark: {
    type: String,
    required: true,
    trim: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changedByRole: {
    type: String,
    default: 'officer'
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

GrievanceHistorySchema.index({ grievanceId: 1, createdAt: -1 });

module.exports = mongoose.model('GrievanceHistory', GrievanceHistorySchema);
