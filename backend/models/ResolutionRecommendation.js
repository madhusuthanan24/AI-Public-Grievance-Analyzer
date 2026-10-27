const mongoose = require('mongoose');

const HistoryEntrySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  performedByRole: {
    type: String,
    enum: ['officer', 'admin', 'system'],
    default: 'system'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: null,
    trim: true
  },
  previousDecision: {
    type: String,
    default: null
  },
  newDecision: {
    type: String,
    default: null
  }
}, { _id: false });

const GeneratedResultSchema = new mongoose.Schema({
  problemSummary: {
    type: String,
    required: true,
    trim: true
  },
  imageObservations: {
    type: String,
    default: '',
    trim: true
  },
  likelyCause: {
    type: String,
    default: '',
    trim: true
  },
  recommendedSolution: {
    type: String,
    required: true,
    trim: true
  },
  resolutionSteps: [{
    type: String,
    trim: true
  }],
  requiredMaterials: [{
    type: String,
    trim: true
  }],
  recommendedDepartment: {
    type: String,
    default: '',
    trim: true
  },
  suggestedPriority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'Low', 'Medium', 'High', 'Critical'],
    default: 'MEDIUM'
  },
  safetyPrecautions: [{
    type: String,
    trim: true
  }],
  requiresSiteInspection: {
    type: Boolean,
    default: true
  },
  estimatedCompletionTime: {
    type: String,
    default: '',
    trim: true
  },
  limitations: {
    type: String,
    default: '',
    trim: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.85
  },
  isFallback: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const ResolutionRecommendationSchema = new mongoose.Schema({
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true
  },
  grievanceId: {
    type: String,
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  generatedResult: {
    type: GeneratedResultSchema,
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  model: {
    type: String,
    default: 'gemini-flash-latest'
  },
  reviewingOfficerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  officerDecision: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'MODIFIED'],
    default: 'PENDING',
    index: true
  },
  officerNotes: {
    type: String,
    default: null,
    trim: true
  },
  officerModifiedSteps: [{
    type: String,
    trim: true
  }],
  officerActionTaken: {
    type: String,
    default: null,
    trim: true
  },
  adminDecision: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVISION'],
    default: 'PENDING',
    index: true
  },
  adminNotes: {
    type: String,
    default: null,
    trim: true
  },
  reviewedByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  actualResolutionNotes: {
    type: String,
    default: null,
    trim: true
  },
  history: [HistoryEntrySchema]
}, {
  timestamps: true
});

ResolutionRecommendationSchema.index({ complaintId: 1, version: -1 });
ResolutionRecommendationSchema.index({ grievanceId: 1, version: -1 });
ResolutionRecommendationSchema.index({ officerDecision: 1, adminDecision: 1 });
ResolutionRecommendationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ResolutionRecommendation', ResolutionRecommendationSchema);
