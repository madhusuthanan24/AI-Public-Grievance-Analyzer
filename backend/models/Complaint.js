const mongoose = require('mongoose');

const RemarkSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  officerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const ComplaintSchema = new mongoose.Schema({
  grievanceId: {
    type: String,
    unique: true,
    default: function() {
      const year = new Date().getFullYear();
      const rand = Math.floor(100000 + Math.random() * 900000);
      return `GRV-${year}-${rand}`;
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  category: {
    type: String,
    enum: [
      'Roads',
      'Road Maintenance',
      'Water Supply',
      'Electricity',
      'Sanitation',
      'Waste Management',
      'Public Transport',
      'Street Lights',
      'Drainage',
      'Public Health',
      'Healthcare',
      'Public Safety',
      'Education',
      'Government Services',
      'Other'
    ],
    default: 'Other'
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  imageUrl: {
    type: String,
    default: null
  },
  attachments: [{
    url: String,
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    storageProvider: { type: String, default: 'gridfs' },
    storageKey: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  assignedDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  assignedOfficerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: [
      'Submitted',
      'Under Review',
      'In Progress',
      'Resolved',
      'SUBMITTED',
      'AI_ANALYZED',
      'ASSIGNED',
      'IN_PROGRESS',
      'RESOLVED',
      'REJECTED',
      'CLOSED'
    ],
    default: 'Submitted'
  },
  isDuplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    default: null
  },
  aiSummary: {
    type: String,
    default: null
  },
  aiReason: {
    type: String,
    default: null
  },
  aiConfidence: {
    type: Number,
    default: null
  },
  aiRecommendedAction: {
    type: String,
    default: null
  },
  aiExtractedEntities: {
    location: { type: String, default: null },
    issue: { type: String, default: null },
    service: { type: String, default: null },
    date: { type: String, default: null }
  },
  // Module 6: Administrative Review Tracking
  isReviewed: {
    type: Boolean,
    default: false
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewNotes: {
    type: String,
    default: null,
    trim: true
  },
  // Module 8: Officer Processing & Resolution Workflow
  officerRemarks: {
    type: String,
    default: null,
    trim: true
  },
  officerAction: {
    type: String,
    default: null,
    trim: true
  },
  resolutionRemark: {
    type: String,
    default: null,
    trim: true
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  // Module 9: Duplicate Detection & Administrative Decision Fields
  duplicateCandidates: [{
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true
    },
    grievanceId: {
      type: String,
      required: true
    },
    similarityScore: {
      type: Number,
      min: 0,
      max: 1,
      required: true
    },
    similarityLevel: {
      type: String,
      enum: ['Very High', 'High', 'Moderate', 'Low'],
      default: 'Moderate'
    },
    reason: {
      type: String,
      default: ''
    },
    matchingFactors: [{
      type: String
    }],
    detectedAt: {
      type: Date,
      default: Date.now
    }
  }],
  duplicateReviewStatus: {
    type: String,
    enum: ['PENDING', 'NOT_DUPLICATE', 'CONFIRMED_DUPLICATE'],
    default: 'PENDING'
  },
  confirmedDuplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    default: null
  },
  duplicateReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  duplicateReviewedAt: {
    type: Date,
    default: null
  },
  duplicateReviewNote: {
    type: String,
    default: null,
    trim: true
  },
  // Module: AI Resolution Assistant
  hasAIResolution: {
    type: Boolean,
    default: false
  },
  latestRecommendationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResolutionRecommendation',
    default: null
  },
  resolutionReviewStatus: {
    type: String,
    enum: ['NONE', 'PENDING', 'ACCEPTED', 'REJECTED', 'MODIFIED', 'APPROVED', 'NEEDS_REVISION'],
    default: 'NONE'
  },
  remarks: [RemarkSchema]
}, {
  timestamps: true
});

// Indexes for high-throughput searching and administrative filtering (grievanceId is already indexed via unique: true)
ComplaintSchema.index({ userId: 1, createdAt: -1 });
ComplaintSchema.index({ status: 1 });
ComplaintSchema.index({ priority: 1 });
ComplaintSchema.index({ category: 1 });
ComplaintSchema.index({ assignedDepartment: 1 });
ComplaintSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Complaint', ComplaintSchema);
