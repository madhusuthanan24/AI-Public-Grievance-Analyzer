const mongoose = require('mongoose');

const AIAnalysisSchema = new mongoose.Schema({
  grievanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true
  },
  department: {
    type: String,
    default: null
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'Low', 'Medium', 'High', 'Critical'],
    default: 'MEDIUM'
  },
  summary: {
    type: String,
    default: ''
  },
  reason: {
    type: String,
    default: ''
  },
  recommendedAction: {
    type: String,
    default: ''
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.85
  },
  extractedEntities: {
    location: { type: String, default: null },
    issue: { type: String, default: null },
    service: { type: String, default: null },
    date: { type: String, default: null }
  },
  analyzedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

AIAnalysisSchema.index({ grievanceId: 1 });
AIAnalysisSchema.index({ category: 1 });
AIAnalysisSchema.index({ priority: 1 });

module.exports = mongoose.model('AIAnalysis', AIAnalysisSchema);
