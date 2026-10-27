const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const User = require('../models/User');
const GrievanceHistory = require('../models/GrievanceHistory');
const AIAnalysis = require('../models/AIAnalysis');
const aiService = require('../services/aiService');
const duplicateDetectionService = require('../services/duplicateDetectionService');
const memoryStore = require('../config/memoryStore');

/**
 * Helper to populate an in-memory complaint with related references
 */
const populateMemoryComplaint = (c) => {
  if (!c) return null;
  const user = memoryStore.users.find(u => u._id.toString() === (c.userId?._id || c.userId || '').toString());
  const dept = memoryStore.departments.find(d => d._id.toString() === (c.assignedDepartment?._id || c.assignedDepartment || '').toString());
  const assignedOfficer = c.assignedOfficerId ? memoryStore.users.find(u => u._id.toString() === (c.assignedOfficerId?._id || c.assignedOfficerId || '').toString()) : null;

  const remarks = (c.remarks || []).map(r => {
    const officer = memoryStore.users.find(u => u._id.toString() === (r.officerId?._id || r.officerId || '').toString());
    return {
      text: r.text,
      date: r.date,
      officerId: officer ? { _id: officer._id, name: officer.name, role: officer.role } : r.officerId
    };
  });

  const reviewer = c.reviewedBy ? memoryStore.users.find(u => u._id.toString() === (c.reviewedBy?._id || c.reviewedBy || '').toString()) : null;

  return {
    _id: c._id,
    grievanceId: c.grievanceId || `GRV-2026-${String(c._id).slice(-6).toUpperCase()}`,
    title: c.title,
    description: c.description,
    category: c.category,
    priority: c.priority,
    location: c.location,
    imageUrl: c.imageUrl,
    attachments: c.attachments || [],
    status: c.status,
    isDuplicateOf: c.isDuplicateOf || null,
    duplicateCandidates: c.duplicateCandidates || [],
    duplicateReviewStatus: c.duplicateReviewStatus || 'PENDING',
    confirmedDuplicateOf: c.confirmedDuplicateOf || null,
    duplicateReviewedBy: c.duplicateReviewedBy || null,
    duplicateReviewedAt: c.duplicateReviewedAt || null,
    duplicateReviewNote: c.duplicateReviewNote || null,
    aiSummary: c.aiSummary,
    aiReason: c.aiReason,
    aiConfidence: c.aiConfidence,
    aiRecommendedAction: c.aiRecommendedAction,
    aiExtractedEntities: c.aiExtractedEntities,
    isReviewed: !!c.isReviewed,
    reviewedBy: reviewer ? { _id: reviewer._id, name: reviewer.name, role: reviewer.role } : c.reviewedBy,
    reviewedAt: c.reviewedAt || null,
    reviewNotes: c.reviewNotes || null,
    officerRemarks: c.officerRemarks || null,
    officerAction: c.officerAction || null,
    resolutionRemark: c.resolutionRemark || null,
    resolvedAt: c.resolvedAt || null,
    remarks,
    userId: user ? { _id: user._id, name: user.name, email: user.email, phone: user.phone } : c.userId,
    assignedDepartment: dept ? { _id: dept._id, name: dept.name, code: dept.code } : null,
    assignedOfficerId: assignedOfficer ? { _id: assignedOfficer._id, name: assignedOfficer.name, email: assignedOfficer.email, role: assignedOfficer.role } : (c.assignedOfficerId || null),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  };
};

/**
 * Generates a unique grievance ID in GRV-YYYY-XXXXXX format (Module 5.2)
 */
const generateUniqueGrievanceId = async () => {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 10; attempt++) {
    const rand = Math.floor(100000 + Math.random() * 900000);
    const candidateId = `GRV-${year}-${rand}`;

    if (mongoose.connection.readyState === 1) {
      const exists = await Complaint.findOne({ grievanceId: candidateId });
      if (!exists) return candidateId;
    } else {
      const exists = memoryStore.complaints.find(c => c.grievanceId === candidateId);
      if (!exists) return candidateId;
    }
  }
  return `GRV-${year}-${Date.now().toString().slice(-6)}`;
};

// @desc    Submit a new complaint / grievance (Module 5.1 - 5.16)
// @route   POST /api/complaints
// @access  Private (Citizen)
exports.submitComplaint = async (req, res) => {
  try {
    const { title, description, location, category: userCat } = req.body;

    // Strict Request Validation (Module 5.1)
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ message: 'Title is required (minimum 3 characters)' });
    }
    if (title.trim().length > 200) {
      return res.status(400).json({ message: 'Title cannot exceed 200 characters' });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({ message: 'Description is required (minimum 10 characters)' });
    }
    if (description.trim().length > 3000) {
      return res.status(400).json({ message: 'Description cannot exceed 3000 characters' });
    }

    if (!location || typeof location !== 'string' || location.trim().length < 3) {
      return res.status(400).json({ message: 'Location is required (minimum 3 characters)' });
    }
    if (location.trim().length > 200) {
      return res.status(400).json({ message: 'Location cannot exceed 200 characters' });
    }

    // Optional category validation
    let validatedUserCategory = null;
    if (userCat && typeof userCat === 'string' && userCat.trim() !== '') {
      const matched = aiService.ALLOWED_CATEGORIES.find(
        c => c.toLowerCase() === userCat.trim().toLowerCase()
      );
      if (!matched) {
        return res.status(400).json({
          message: `Invalid category. Must be one of: ${aiService.ALLOWED_CATEGORIES.join(', ')}`
        });
      }
      validatedUserCategory = matched;
    }

    // Security: Ignore client-injected administrative fields
    // (status, assignedOfficerId, assignedDepartment, aiConfidence, aiSummary, aiReason, aiRecommendedAction)

    // Unique Grievance Tracking ID (Module 5.2)
    const humanGrievanceId = await generateUniqueGrievanceId();

    // Handle File Attachment (Module 5.22 - Storing evidence metadata and canonical API route)
    let imageUrl = null;
    let attachments = [];
    if (req.file) {
      const evidenceApiUrl = `/api/complaints/${humanGrievanceId}/evidence/${req.file.filename}`;
      imageUrl = evidenceApiUrl;
      attachments.push({
        url: evidenceApiUrl,
        filename: req.file.filename,
        originalName: req.file.originalname || req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date()
      });
    }

    // 1. Initial State: Status = SUBMITTED (Module 5.3)
    let initialStatus = 'SUBMITTED';
    let assignedCategory = validatedUserCategory || 'Other';
    let assignedPriority = 'MEDIUM';
    let assignedDepartment = null;

    let savedComplaint;
    if (mongoose.connection.readyState === 1) {
      const complaintDoc = new Complaint({
        grievanceId: humanGrievanceId,
        userId: req.user._id,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        imageUrl,
        attachments,
        category: assignedCategory,
        priority: assignedPriority,
        assignedDepartment: null,
        status: initialStatus
      });

      savedComplaint = await complaintDoc.save();

      // Initial history record (Module 5.3)
      await GrievanceHistory.create({
        grievanceId: savedComplaint._id,
        status: 'SUBMITTED',
        remark: 'Grievance submitted by citizen.',
        changedBy: req.user._id,
        changedByRole: 'citizen'
      });
    } else {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ message: 'Database service is temporarily unavailable. Please try again shortly.' });
      }
      // In-memory initial save
      savedComplaint = {
        _id: memoryStore.generateId(),
        grievanceId: humanGrievanceId,
        userId: req.user._id,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        imageUrl,
        attachments,
        category: assignedCategory,
        priority: assignedPriority,
        assignedDepartment: null,
        status: initialStatus,
        remarks: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.complaints.unshift(savedComplaint);

      memoryStore.grievanceHistories.push({
        _id: memoryStore.generateId(),
        grievanceId: savedComplaint._id,
        status: 'SUBMITTED',
        remark: 'Grievance submitted by citizen.',
        changedBy: req.user._id,
        changedByRole: 'citizen',
        createdAt: new Date()
      });
    }

    // 2. Gemini AI Analysis Pipeline (Module 5.4 - 5.16)
    try {
      const aiResult = await aiService.analyzeGrievance({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        userCategory: validatedUserCategory
      });

      // Department resolution
      assignedDepartment = await aiService.resolveDepartmentId(aiResult.department, aiResult.category);

      // Update Grievance with AI insights & transition status to AI_ANALYZED
      if (mongoose.connection.readyState === 1) {
        savedComplaint.status = 'AI_ANALYZED';
        savedComplaint.category = aiResult.category;
        savedComplaint.priority = aiResult.priority;
        savedComplaint.assignedDepartment = assignedDepartment;
        savedComplaint.aiSummary = aiResult.summary;
        savedComplaint.aiReason = aiResult.reason;
        savedComplaint.aiConfidence = aiResult.confidence;
        savedComplaint.aiRecommendedAction = aiResult.recommendedAction;
        savedComplaint.aiExtractedEntities = aiResult.extractedEntities;
        await savedComplaint.save();

        // Second history record: AI_ANALYZED (Module 5.3)
        await GrievanceHistory.create({
          grievanceId: savedComplaint._id,
          status: 'AI_ANALYZED',
          remark: 'Grievance analyzed by AI.',
          changedBy: req.user._id,
          changedByRole: 'citizen'
        });

        // Store dedicated AIAnalysis document (Module 5.15)
        await AIAnalysis.create({
          grievanceId: savedComplaint._id,
          category: aiResult.category,
          department: aiResult.department,
          priority: aiResult.priority,
          summary: aiResult.summary,
          reason: aiResult.reason,
          recommendedAction: aiResult.recommendedAction,
          confidence: aiResult.confidence,
          extractedEntities: aiResult.extractedEntities,
          analyzedAt: new Date()
        });

        // 3. Duplicate Detection & Similarity Analysis (Module 9.2 - 9.7)
        try {
          const duplicateCandidates = await duplicateDetectionService.detectDuplicates(savedComplaint);
          if (duplicateCandidates && duplicateCandidates.length > 0) {
            savedComplaint.duplicateCandidates = duplicateCandidates;
            savedComplaint.duplicateReviewStatus = 'PENDING';
            await savedComplaint.save();
          }
        } catch (dupErr) {
          console.warn('[Complaint Submission] Duplicate detection non-fatal error:', dupErr.message);
        }

        const populated = await Complaint.findById(savedComplaint._id)
          .populate('assignedDepartment', 'name code');
        return res.status(201).json(populated);
      } else {
        // In-memory update
        savedComplaint.status = 'AI_ANALYZED';
        savedComplaint.category = aiResult.category;
        savedComplaint.priority = aiResult.priority;
        savedComplaint.assignedDepartment = assignedDepartment;
        savedComplaint.aiSummary = aiResult.summary;
        savedComplaint.aiReason = aiResult.reason;
        savedComplaint.aiConfidence = aiResult.confidence;
        savedComplaint.aiRecommendedAction = aiResult.recommendedAction;
        savedComplaint.aiExtractedEntities = aiResult.extractedEntities;
        savedComplaint.updatedAt = new Date();

        // Memory history record
        memoryStore.grievanceHistories.push({
          _id: memoryStore.generateId(),
          grievanceId: savedComplaint._id,
          status: 'AI_ANALYZED',
          remark: 'Grievance analyzed by AI.',
          changedBy: req.user._id,
          changedByRole: 'citizen',
          createdAt: new Date()
        });

        // Memory AIAnalysis record
        memoryStore.aiAnalyses.push({
          _id: memoryStore.generateId(),
          grievanceId: savedComplaint._id,
          category: aiResult.category,
          department: aiResult.department,
          priority: aiResult.priority,
          summary: aiResult.summary,
          reason: aiResult.reason,
          recommendedAction: aiResult.recommendedAction,
          confidence: aiResult.confidence,
          extractedEntities: aiResult.extractedEntities,
          analyzedAt: new Date()
        });

        // In-memory duplicate detection (Module 9.2 - 9.7)
        try {
          const duplicateCandidates = await duplicateDetectionService.detectDuplicates(savedComplaint);
          if (duplicateCandidates && duplicateCandidates.length > 0) {
            savedComplaint.duplicateCandidates = duplicateCandidates;
            savedComplaint.duplicateReviewStatus = 'PENDING';
          }
        } catch (dupErr) {
          console.warn('[Complaint Submission] Duplicate detection non-fatal error:', dupErr.message);
        }

        return res.status(201).json(populateMemoryComplaint(savedComplaint));
      }
    } catch (aiError) {
      console.warn('[Complaint Submission] AI Analysis failure, keeping SUBMITTED status:', aiError.message);
      // Status remains 'SUBMITTED', ready for manual administrator review (Module 5.3)
      try {
        const duplicateCandidates = await duplicateDetectionService.detectDuplicates(savedComplaint);
        if (duplicateCandidates && duplicateCandidates.length > 0) {
          savedComplaint.duplicateCandidates = duplicateCandidates;
          savedComplaint.duplicateReviewStatus = 'PENDING';
          if (mongoose.connection.readyState === 1) {
            await savedComplaint.save();
          }
        }
      } catch (dupErr) {
        console.warn('[Complaint Submission] Duplicate detection fallback non-fatal error:', dupErr.message);
      }

      if (mongoose.connection.readyState === 1) {
        return res.status(201).json(savedComplaint);
      } else {
        return res.status(201).json(populateMemoryComplaint(savedComplaint));
      }
    }
  } catch (error) {
    console.error('Submit complaint error:', error);
    res.status(500).json({ message: 'Server error processing grievance' });
  }
};

// @desc    Get current user's complaints
// @route   GET /api/complaints/my
// @access  Private (Citizen)
exports.getMyComplaints = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const complaints = await Complaint.find({ userId: req.user._id })
        .populate('assignedDepartment', 'name code')
        .sort({ createdAt: -1 });
      return res.json(complaints);
    }

    const userComplaints = memoryStore.complaints
      .filter(c => (c.userId?._id || c.userId || '').toString() === req.user._id.toString())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(populateMemoryComplaint);

    res.json(userComplaints);
  } catch (error) {
    console.error('getMyComplaints error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get complaint by ID or Grievance ID
// @route   GET /api/complaints/:id
// @access  Private (Citizen/Officer/Admin)
exports.getComplaintById = async (req, res) => {
  try {
    const param = req.params.id;

    if (mongoose.connection.readyState === 1) {
      let query = { $or: [{ grievanceId: param }] };
      if (mongoose.Types.ObjectId.isValid(param)) {
        query.$or.push({ _id: param });
      }

      const complaint = await Complaint.findOne(query)
        .populate('userId', 'name email phone')
        .populate('assignedDepartment', 'name code')
        .populate('assignedOfficerId', 'name email role department')
        .populate('reviewedBy', 'name role')
        .populate('remarks.officerId', 'name role');

      if (!complaint) {
        return res.status(404).json({ message: 'Grievance not found' });
      }

      // Role check authorization (Module 4 & Module 7.14, 7.20)
      if (req.user.role === 'citizen' && complaint.userId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden: Access denied' });
      }

      if (req.user.role === 'officer') {
        const officerId = req.user._id.toString();
        const officerDept = req.user.department ? req.user.department.toString() : '';
        const complaintDept = complaint.assignedDepartment ? complaint.assignedDepartment._id.toString() : '';
        const assignedOfficer = complaint.assignedOfficerId ? (complaint.assignedOfficerId._id || complaint.assignedOfficerId).toString() : null;

        // If explicitly assigned to an officer, only that assigned officer can access it
        if (assignedOfficer) {
          if (assignedOfficer !== officerId) {
            return res.status(403).json({ message: 'Forbidden: You are not the assigned officer for this grievance' });
          }
        } else if (officerDept !== complaintDept) {
          // If unassigned, only officers of the same department may view
          return res.status(403).json({ message: 'Forbidden: Restricted to assigned department complaints' });
        }
      }

      // Retrieve full history & AI analysis
      const history = await GrievanceHistory.find({ grievanceId: complaint._id })
        .populate('changedBy', 'name role')
        .sort({ createdAt: 1 });

      const aiAnalysis = await AIAnalysis.findOne({ grievanceId: complaint._id });

      if (complaint.duplicateCandidates && complaint.duplicateCandidates.length > 0) {
        await complaint.populate('duplicateCandidates.complaintId', 'title category location status priority grievanceId');
      }
      if (complaint.confirmedDuplicateOf) {
        await complaint.populate('confirmedDuplicateOf', 'title category location status priority grievanceId');
      }

      const complaintObj = complaint.toObject();
      complaintObj.history = history;
      complaintObj.aiAnalysis = aiAnalysis;

      // Sanitize internal duplicate review details from citizen view (Module 9.13)
      if (req.user.role === 'citizen') {
        delete complaintObj.duplicateCandidates;
        delete complaintObj.duplicateReviewNote;
      }

      return res.json(complaintObj);
    }

    // In-memory fallback
    const c = memoryStore.complaints.find(comp =>
      comp._id.toString() === param.toString() || comp.grievanceId === param
    );
    if (!c) {
      return res.status(404).json({ message: 'Grievance not found' });
    }

    const populated = populateMemoryComplaint(c);

    if (req.user.role === 'citizen' && populated.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: Access denied' });
    }

    if (req.user.role === 'officer') {
      const officerId = req.user._id.toString();
      const officerDept = req.user.department ? (req.user.department._id || req.user.department).toString() : '';
      const complaintDept = populated.assignedDepartment ? (populated.assignedDepartment._id || populated.assignedDepartment).toString() : '';
      const assignedOfficer = populated.assignedOfficerId ? (populated.assignedOfficerId._id || populated.assignedOfficerId).toString() : null;

      if (assignedOfficer) {
        if (assignedOfficer !== officerId) {
          return res.status(403).json({ message: 'Forbidden: You are not the assigned officer for this grievance' });
        }
      } else if (officerDept !== complaintDept) {
        return res.status(403).json({ message: 'Forbidden: Restricted to assigned department complaints' });
      }
    }

    populated.history = memoryStore.grievanceHistories
      .filter(h => h.grievanceId.toString() === populated._id.toString())
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    populated.aiAnalysis = memoryStore.aiAnalyses.find(
      a => a.grievanceId.toString() === populated._id.toString()
    ) || null;

    // Sanitize or enrich duplicate candidate data
    if (req.user.role === 'citizen') {
      delete populated.duplicateCandidates;
      delete populated.duplicateReviewNote;
    } else {
      if (populated.duplicateCandidates) {
        populated.duplicateCandidates = populated.duplicateCandidates.map(cand => {
          const fullCand = memoryStore.complaints.find(comp => comp._id.toString() === (cand.complaintId?._id || cand.complaintId || '').toString());
          return {
            ...cand,
            complaintId: fullCand ? {
              _id: fullCand._id,
              grievanceId: fullCand.grievanceId,
              title: fullCand.title,
              category: fullCand.category,
              location: fullCand.location,
              status: fullCand.status,
              priority: fullCand.priority
            } : cand.complaintId
          };
        });
      }
      if (populated.confirmedDuplicateOf) {
        const fullTarget = memoryStore.complaints.find(comp => comp._id.toString() === (populated.confirmedDuplicateOf?._id || populated.confirmedDuplicateOf || '').toString());
        if (fullTarget) {
          populated.confirmedDuplicateOf = {
            _id: fullTarget._id,
            grievanceId: fullTarget.grievanceId,
            title: fullTarget.title,
            category: fullTarget.category,
            status: fullTarget.status
          };
        }
      }
    }

    res.json(populated);
  } catch (error) {
    console.error('getComplaintById error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get complaints for officer's assigned department
// @route   GET /api/complaints/department
// @access  Private (Officer)
exports.getDepartmentComplaints = async (req, res) => {
  try {
    const userDeptId = req.user.department ? (req.user.department._id || req.user.department).toString() : '';
    if (!userDeptId) {
      return res.status(400).json({ message: 'Officer is not assigned to any department' });
    }

    if (mongoose.connection.readyState === 1) {
      const complaints = await Complaint.find({ assignedDepartment: userDeptId })
        .populate('userId', 'name email phone')
        .populate('assignedDepartment', 'name code')
        .sort({ createdAt: -1 });
      return res.json(complaints);
    }

    const complaints = memoryStore.complaints
      .filter(c => (c.assignedDepartment?._id || c.assignedDepartment || '').toString() === userDeptId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(populateMemoryComplaint);

    res.json(complaints);
  } catch (error) {
    console.error('getDepartmentComplaints error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update complaint status & officer processing lifecycle (Module 8.3 - 8.10)
// @route   PUT /api/complaints/:id/status
// @access  Private (Officer/Admin)
exports.updateComplaintStatus = async (req, res) => {
  try {
    const param = req.params.id;
    const { status, remark, officerAction, actionTaken, resolutionRemark } = req.body || {};

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const normTarget = status.toUpperCase().replace(/\s+/g, '_');
    const allowedStatuses = ['IN_PROGRESS', 'RESOLVED'];

    if (!allowedStatuses.includes(normTarget)) {
      return res.status(400).json({ message: `Invalid status transition: "${status}". Allowed transitions in processing workflow are IN_PROGRESS or RESOLVED.` });
    }

    // Remark validation
    const candidateRemark = (remark || resolutionRemark || '').trim();
    const candidateAction = (actionTaken || officerAction || '').trim();

    if (mongoose.connection.readyState === 1) {
      let query = { $or: [{ grievanceId: param }] };
      if (mongoose.Types.ObjectId.isValid(param)) {
        query.$or.push({ _id: param });
      }
      const complaint = await Complaint.findOne(query);
      if (!complaint) {
        return res.status(404).json({ message: 'Grievance not found' });
      }

      // Officer authorization: only assigned officer can process (Module 8.3, 8.10)
      if (req.user.role === 'officer') {
        const assignedId = complaint.assignedOfficerId ? complaint.assignedOfficerId.toString() : '';
        if (assignedId !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Forbidden: Only the assigned officer can process this grievance' });
        }
      }

      const currNorm = (complaint.status || '').toUpperCase().replace(/\s+/g, '_');

      // Status transition validation (Module 8.3)
      if (normTarget === 'IN_PROGRESS') {
        if (currNorm === 'RESOLVED') {
          return res.status(400).json({ message: 'Cannot transition from RESOLVED back to IN_PROGRESS' });
        }
        if (currNorm !== 'ASSIGNED' && currNorm !== 'IN_PROGRESS') {
          return res.status(400).json({ message: `Cannot start processing grievance with status "${complaint.status}". Must be ASSIGNED.` });
        }
      }

      if (normTarget === 'RESOLVED') {
        if (currNorm === 'ASSIGNED') {
          return res.status(400).json({ message: 'Cannot resolve grievance directly from ASSIGNED. Officer must start processing (IN_PROGRESS) first.' });
        }
        if (currNorm !== 'IN_PROGRESS' && currNorm !== 'RESOLVED') {
          return res.status(400).json({ message: `Cannot resolve grievance with status "${complaint.status}". Must be IN_PROGRESS.` });
        }
        if (!candidateRemark) {
          return res.status(400).json({ message: 'Resolution remark is required to mark grievance as resolved' });
        }
      }

      // If already in target status and no new remark/action, avoid duplicate history
      if (currNorm === normTarget && !candidateRemark && !candidateAction) {
        return res.json(complaint);
      }

      // Update fields without modifying AI analysis or citizen identity/description
      complaint.status = normTarget;

      if (candidateAction) {
        complaint.officerAction = candidateAction;
      }

      if (normTarget === 'IN_PROGRESS') {
        if (candidateRemark) {
          complaint.officerRemarks = candidateRemark;
        }
      } else if (normTarget === 'RESOLVED') {
        complaint.resolutionRemark = candidateRemark;
        complaint.resolvedAt = new Date();
      }

      // Add to officer remarks sub-array if remark was provided
      if (candidateRemark) {
        complaint.remarks.push({
          text: candidateRemark,
          officerId: req.user._id,
          date: new Date()
        });
      }

      await complaint.save();

      // Create GrievanceHistory audit entry
      let historyRemark = candidateRemark;
      if (!historyRemark) {
        historyRemark = normTarget === 'IN_PROGRESS'
          ? `Officer started processing the grievance.`
          : `Grievance resolved by assigned officer.`;
      }

      await GrievanceHistory.create({
        grievanceId: complaint._id,
        status: normTarget,
        remark: historyRemark,
        changedBy: req.user._id,
        changedByRole: req.user.role
      });

      const updated = await Complaint.findById(complaint._id)
        .populate('userId', 'name email phone')
        .populate('assignedDepartment', 'name code')
        .populate('assignedOfficerId', 'name email role department')
        .populate('reviewedBy', 'name role')
        .populate('remarks.officerId', 'name role');

      const history = await GrievanceHistory.find({ grievanceId: complaint._id })
        .populate('changedBy', 'name role')
        .sort({ createdAt: 1 });
      const aiAnalysis = await AIAnalysis.findOne({ grievanceId: complaint._id });

      const complaintObj = updated.toObject();
      complaintObj.history = history;
      complaintObj.aiAnalysis = aiAnalysis;

      return res.json(complaintObj);
    }

    // In-memory fallback
    const complaint = memoryStore.complaints.find(c =>
      c.grievanceId === param || c._id.toString() === param.toString()
    );
    if (!complaint) {
      return res.status(404).json({ message: 'Grievance not found' });
    }

    if (req.user.role === 'officer') {
      const assignedId = (complaint.assignedOfficerId?._id || complaint.assignedOfficerId || '').toString();
      if (assignedId !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden: Only the assigned officer can process this grievance' });
      }
    }

    const currNorm = (complaint.status || '').toUpperCase().replace(/\s+/g, '_');

    if (normTarget === 'IN_PROGRESS') {
      if (currNorm === 'RESOLVED') {
        return res.status(400).json({ message: 'Cannot transition from RESOLVED back to IN_PROGRESS' });
      }
      if (currNorm !== 'ASSIGNED' && currNorm !== 'IN_PROGRESS') {
        return res.status(400).json({ message: `Cannot start processing grievance with status "${complaint.status}". Must be ASSIGNED.` });
      }
    }

    if (normTarget === 'RESOLVED') {
      if (currNorm === 'ASSIGNED') {
        return res.status(400).json({ message: 'Cannot resolve grievance directly from ASSIGNED. Officer must start processing (IN_PROGRESS) first.' });
      }
      if (currNorm !== 'IN_PROGRESS' && currNorm !== 'RESOLVED') {
        return res.status(400).json({ message: `Cannot resolve grievance with status "${complaint.status}". Must be IN_PROGRESS.` });
      }
      if (!candidateRemark) {
        return res.status(400).json({ message: 'Resolution remark is required to mark grievance as resolved' });
      }
    }

    complaint.status = normTarget;
    complaint.updatedAt = new Date();

    if (candidateAction) {
      complaint.officerAction = candidateAction;
    }

    if (normTarget === 'IN_PROGRESS') {
      if (candidateRemark) {
        complaint.officerRemarks = candidateRemark;
      }
    } else if (normTarget === 'RESOLVED') {
      complaint.resolutionRemark = candidateRemark;
      complaint.resolvedAt = new Date();
    }

    if (!complaint.remarks) complaint.remarks = [];
    if (candidateRemark) {
      complaint.remarks.push({
        text: candidateRemark,
        officerId: req.user._id,
        date: new Date()
      });
    }

    let historyRemark = candidateRemark;
    if (!historyRemark) {
      historyRemark = normTarget === 'IN_PROGRESS'
        ? `Officer started processing the grievance.`
        : `Grievance resolved by assigned officer.`;
    }

    memoryStore.grievanceHistories.push({
      _id: memoryStore.generateId(),
      grievanceId: complaint._id,
      status: normTarget,
      remark: historyRemark,
      changedBy: req.user._id,
      changedByRole: req.user.role,
      createdAt: new Date()
    });

    const populated = populateMemoryComplaint(complaint);
    populated.history = memoryStore.grievanceHistories
      .filter(h => h.grievanceId.toString() === populated._id.toString())
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    populated.aiAnalysis = memoryStore.aiAnalyses.find(
      a => a.grievanceId.toString() === populated._id.toString()
    ) || null;

    res.json(populated);
  } catch (error) {
    console.error('updateComplaintStatus error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add officer remark to complaint
// @route   POST /api/complaints/:id/remarks
// @access  Private (Officer/Admin)
exports.addComplaintRemark = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Remark text is required' });
    }

    if (mongoose.connection.readyState === 1) {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) {
        return res.status(404).json({ message: 'Complaint not found' });
      }

      if (req.user.role === 'officer') {
        const officerDept = req.user.department ? req.user.department.toString() : '';
        const complaintDept = complaint.assignedDepartment ? complaint.assignedDepartment.toString() : '';
        if (officerDept !== complaintDept) {
          return res.status(403).json({ message: 'Forbidden: Access restricted to assigned department' });
        }
      }

      complaint.remarks.push({
        text: text.trim(),
        officerId: req.user._id,
        date: new Date()
      });

      await complaint.save();

      // Also record in GrievanceHistory
      await GrievanceHistory.create({
        grievanceId: complaint._id,
        status: complaint.status,
        remark: text.trim(),
        changedBy: req.user._id,
        changedByRole: req.user.role
      });

      const updatedComplaint = await Complaint.findById(req.params.id)
        .populate('remarks.officerId', 'name role');

      return res.json(updatedComplaint.remarks);
    }

    // In-memory fallback
    const complaint = memoryStore.complaints.find(c => c._id.toString() === req.params.id.toString());
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (req.user.role === 'officer') {
      const officerDept = req.user.department ? (req.user.department._id || req.user.department).toString() : '';
      const complaintDept = complaint.assignedDepartment ? (complaint.assignedDepartment._id || complaint.assignedDepartment).toString() : '';
      if (officerDept !== complaintDept) {
        return res.status(403).json({ message: 'Forbidden: Access restricted to assigned department' });
      }
    }

    complaint.remarks = complaint.remarks || [];
    complaint.remarks.push({
      text: text.trim(),
      officerId: req.user._id,
      date: new Date()
    });
    complaint.updatedAt = new Date();

    memoryStore.grievanceHistories.push({
      _id: memoryStore.generateId(),
      grievanceId: complaint._id,
      status: complaint.status,
      remark: text.trim(),
      changedBy: req.user._id,
      changedByRole: req.user.role,
      createdAt: new Date()
    });

    const populated = populateMemoryComplaint(complaint);
    res.json(populated.remarks);
  } catch (error) {
    console.error('addComplaintRemark error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get grievances assigned specifically to authenticated officer (Module 7.14)
// @route   GET /api/complaints/officer
// @access  Private (Officer)
exports.getOfficerComplaints = async (req, res) => {
  try {
    const officerId = req.user._id.toString();

    if (mongoose.connection.readyState === 1) {
      const complaints = await Complaint.find({ assignedOfficerId: req.user._id })
        .populate('userId', 'name email phone')
        .populate('assignedDepartment', 'name code')
        .populate('assignedOfficerId', 'name email role')
        .sort({ createdAt: -1 });
      return res.json(complaints);
    }

    // In-memory fallback: strictly match assignedOfficerId
    const complaints = memoryStore.complaints
      .filter(c => {
        const assignedId = (c.assignedOfficerId?._id || c.assignedOfficerId || '').toString();
        return assignedId === officerId;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(populateMemoryComplaint);

    res.json(complaints);
  } catch (error) {
    console.error('getOfficerComplaints error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Assign grievance to department and officer (Module 7.7 - 7.12)
// @route   PUT /api/complaints/:id/assign
// @access  Private (Admin only)
exports.assignComplaint = async (req, res) => {
  try {
    const param = req.params.id;
    const { departmentId, officerId } = req.body || {};

    if (!departmentId) {
      return res.status(400).json({ message: 'Department ID is required for assignment' });
    }
    if (!officerId) {
      return res.status(400).json({ message: 'Officer ID is required for assignment' });
    }

    if (mongoose.connection.readyState === 1) {
      // 1. Validate department
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        return res.status(400).json({ message: 'Invalid Department ID format' });
      }
      const department = await Department.findById(departmentId);
      if (!department) {
        return res.status(400).json({ message: 'Department not found' });
      }

      // 2. Validate officer
      if (!mongoose.Types.ObjectId.isValid(officerId)) {
        return res.status(400).json({ message: 'Invalid Officer ID format' });
      }
      const officer = await User.findById(officerId);
      if (!officer) {
        return res.status(400).json({ message: 'Officer not found' });
      }

      // 3. Verify officer has role = 'officer'
      if ((officer.role || '').toLowerCase() !== 'officer') {
        return res.status(400).json({ message: 'Selected user is not an officer' });
      }

      // 4. Verify officer belongs to selected department
      const officerDeptId = officer.department ? officer.department.toString() : '';
      const inDeptArray = department.officerIds && department.officerIds.some(oid => oid.toString() === officerId.toString());
      if (officerDeptId !== departmentId.toString() && !inDeptArray) {
        return res.status(400).json({ message: `Officer ${officer.name} does not belong to ${department.name}` });
      }

      // 5. Find complaint
      let query = { $or: [{ grievanceId: param }] };
      if (mongoose.Types.ObjectId.isValid(param)) {
        query.$or.push({ _id: param });
      }
      const complaint = await Complaint.findOne(query);
      if (!complaint) {
        return res.status(404).json({ message: 'Grievance not found' });
      }

      // Detect reassignment vs initial assignment
      const isReassignment = complaint.assignedOfficerId && complaint.assignedOfficerId.toString() !== officerId.toString();
      let prevOfficerName = null;
      if (isReassignment) {
        const prevUser = await User.findById(complaint.assignedOfficerId);
        prevOfficerName = prevUser ? prevUser.name : 'previous officer';
      }

      complaint.assignedDepartment = department._id;
      complaint.assignedOfficerId = officer._id;
      complaint.status = 'ASSIGNED';
      await complaint.save();

      // Ensure officer is present in department's officerIds list
      if (!department.officerIds.some(oid => oid.toString() === officer._id.toString())) {
        department.officerIds.push(officer._id);
        await department.save();
      }

      // History record
      const remarkText = isReassignment
        ? `Grievance reassigned from ${prevOfficerName} to ${officer.name} in ${department.name} by Administrator (${req.user.name}).`
        : `Grievance assigned to ${officer.name} in ${department.name} by Administrator (${req.user.name}).`;

      await GrievanceHistory.create({
        grievanceId: complaint._id,
        status: 'ASSIGNED',
        remark: remarkText,
        changedBy: req.user._id,
        changedByRole: 'admin'
      });

      const updated = await Complaint.findById(complaint._id)
        .populate('userId', 'name email phone')
        .populate('assignedDepartment', 'name code')
        .populate('assignedOfficerId', 'name email role department')
        .populate('reviewedBy', 'name role');

      const history = await GrievanceHistory.find({ grievanceId: complaint._id })
        .populate('changedBy', 'name role')
        .sort({ createdAt: 1 });
      const aiAnalysis = await AIAnalysis.findOne({ grievanceId: complaint._id });

      const complaintObj = updated.toObject();
      complaintObj.history = history;
      complaintObj.aiAnalysis = aiAnalysis;

      return res.json(complaintObj);
    }

    // In-memory fallback
    const dept = memoryStore.departments.find(d => d._id.toString() === departmentId.toString());
    if (!dept) {
      return res.status(400).json({ message: 'Department not found' });
    }

    const officer = memoryStore.users.find(u => u._id.toString() === officerId.toString());
    if (!officer) {
      return res.status(400).json({ message: 'Officer not found' });
    }

    if ((officer.role || '').toLowerCase() !== 'officer') {
      return res.status(400).json({ message: 'Selected user is not an officer' });
    }

    const officerDeptId = officer.department ? (officer.department._id || officer.department).toString() : '';
    const inDeptArray = dept.officerIds && dept.officerIds.some(oid => oid.toString() === officerId.toString());
    if (officerDeptId !== departmentId.toString() && !inDeptArray) {
      return res.status(400).json({ message: `Officer ${officer.name} does not belong to ${dept.name}` });
    }

    const complaint = memoryStore.complaints.find(c =>
      c.grievanceId === param || c._id.toString() === param.toString()
    );
    if (!complaint) {
      return res.status(404).json({ message: 'Grievance not found' });
    }

    const isReassignment = complaint.assignedOfficerId && complaint.assignedOfficerId.toString() !== officerId.toString();
    let prevOfficerName = null;
    if (isReassignment) {
      const prevUser = memoryStore.users.find(u => u._id.toString() === (complaint.assignedOfficerId?._id || complaint.assignedOfficerId).toString());
      prevOfficerName = prevUser ? prevUser.name : 'previous officer';
    }

    complaint.assignedDepartment = dept._id;
    complaint.assignedOfficerId = officer._id;
    complaint.status = 'ASSIGNED';
    complaint.updatedAt = new Date();

    if (!dept.officerIds.some(oid => oid.toString() === officer._id.toString())) {
      dept.officerIds.push(officer._id);
    }

    const remarkText = isReassignment
      ? `Grievance reassigned from ${prevOfficerName} to ${officer.name} in ${dept.name} by Administrator (${req.user.name}).`
      : `Grievance assigned to ${officer.name} in ${dept.name} by Administrator (${req.user.name}).`;

    memoryStore.grievanceHistories.push({
      _id: memoryStore.generateId(),
      grievanceId: complaint._id,
      status: 'ASSIGNED',
      remark: remarkText,
      changedBy: req.user._id,
      changedByRole: 'admin',
      createdAt: new Date()
    });

    const populated = populateMemoryComplaint(complaint);
    populated.history = memoryStore.grievanceHistories
      .filter(h => h.grievanceId.toString() === populated._id.toString())
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    populated.aiAnalysis = memoryStore.aiAnalyses.find(
      a => a.grievanceId.toString() === populated._id.toString()
    ) || null;

    res.json(populated);
  } catch (error) {
    console.error('assignComplaint error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all complaints with search, filter, sort, and optional pagination (Module 6.3 - 6.6, 6.15 - 6.16)
// @route   GET /api/complaints or GET /api/complaints/admin
// @access  Private (Admin)
exports.getAllComplaints = async (req, res) => {
  try {
    const {
      search,
      category,
      priority,
      status,
      department,
      sortBy = 'newest',
      page,
      limit
    } = req.query;

    const PRIORITY_ORDER = {
      'CRITICAL': 4,
      'HIGH': 3,
      'MEDIUM': 2,
      'LOW': 1
    };

    if (mongoose.connection.readyState === 1) {
      const query = {};

      if (category && category !== 'ALL') {
        query.category = category;
      }

      if (priority && priority !== 'ALL') {
        query.priority = { $regex: new RegExp(`^${priority}$`, 'i') };
      }

      if (status && status !== 'ALL') {
        const normStatus = status.replace(/\s+/g, '_');
        query.status = { $regex: new RegExp(`^${normStatus}$`, 'i') };
      }

      if (department && department !== 'ALL') {
        if (mongoose.Types.ObjectId.isValid(department)) {
          query.assignedDepartment = department;
        } else {
          const matchedDept = await Department.findOne({
            name: { $regex: new RegExp(department, 'i') }
          });
          if (matchedDept) {
            query.assignedDepartment = matchedDept._id;
          }
        }
      }

      if (search && search.trim()) {
        const term = search.trim();
        const searchRegex = new RegExp(term, 'i');
        const matchedUsers = await User.find({ name: searchRegex }).select('_id');
        const userIds = matchedUsers.map(u => u._id);

        query.$or = [
          { grievanceId: searchRegex },
          { title: searchRegex },
          { description: searchRegex },
          { location: searchRegex },
          { userId: { $in: userIds } }
        ];
      }

      let sortOptions = { createdAt: -1 };
      if (sortBy === 'oldest') {
        sortOptions = { createdAt: 1 };
      }

      let complaintsQuery = Complaint.find(query)
        .populate('userId', 'name email phone')
        .populate('assignedDepartment', 'name code')
        .populate('assignedOfficerId', 'name email role')
        .populate('reviewedBy', 'name role');

      if (sortBy === 'priority_desc' || sortBy === 'priority_asc') {
        // Retrieve and sort in memory for custom enum weights
        let docs = await complaintsQuery;
        docs.sort((a, b) => {
          const pA = PRIORITY_ORDER[(a.priority || '').toUpperCase()] || 0;
          const pB = PRIORITY_ORDER[(b.priority || '').toUpperCase()] || 0;
          return sortBy === 'priority_desc' ? pB - pA : pA - pB;
        });

        if (page && limit) {
          const p = parseInt(page, 10) || 1;
          const l = parseInt(limit, 10) || 20;
          const total = docs.length;
          const paginated = docs.slice((p - 1) * l, p * l);
          return res.json({
            data: paginated,
            page: p,
            limit: l,
            total,
            totalPages: Math.ceil(total / l)
          });
        }
        return res.json(docs);
      }

      complaintsQuery = complaintsQuery.sort(sortOptions);

      if (page && limit) {
        const p = parseInt(page, 10) || 1;
        const l = parseInt(limit, 10) || 20;
        const total = await Complaint.countDocuments(query);
        const docs = await complaintsQuery.skip((p - 1) * l).limit(l);
        return res.json({
          data: docs,
          page: p,
          limit: l,
          total,
          totalPages: Math.ceil(total / l)
        });
      }

      const complaints = await complaintsQuery;
      return res.json(complaints);
    }

    // In-Memory store filtering, searching, and sorting
    let list = memoryStore.complaints.map(populateMemoryComplaint);

    if (category && category !== 'ALL') {
      list = list.filter(c => (c.category || '').toLowerCase() === category.toLowerCase());
    }

    if (priority && priority !== 'ALL') {
      list = list.filter(c => (c.priority || '').toUpperCase() === priority.toUpperCase());
    }

    if (status && status !== 'ALL') {
      const normStatus = status.toUpperCase().replace(/\s+/g, '_');
      list = list.filter(c => (c.status || '').toUpperCase().replace(/\s+/g, '_') === normStatus);
    }

    if (department && department !== 'ALL') {
      const deptTerm = department.toLowerCase();
      list = list.filter(c => {
        const dName = c.assignedDepartment?.name || '';
        const dId = (c.assignedDepartment?._id || '').toString();
        return dName.toLowerCase().includes(deptTerm) || dId === department;
      });
    }

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter(c =>
        (c.grievanceId || '').toLowerCase().includes(term) ||
        (c.title || '').toLowerCase().includes(term) ||
        (c.description || '').toLowerCase().includes(term) ||
        (c.location || '').toLowerCase().includes(term) ||
        (c.userId?.name || '').toLowerCase().includes(term)
      );
    }

    // Sorting
    if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'priority_desc') {
      list.sort((a, b) => {
        const pA = PRIORITY_ORDER[(a.priority || '').toUpperCase()] || 0;
        const pB = PRIORITY_ORDER[(b.priority || '').toUpperCase()] || 0;
        return pB - pA;
      });
    } else if (sortBy === 'priority_asc') {
      list.sort((a, b) => {
        const pA = PRIORITY_ORDER[(a.priority || '').toUpperCase()] || 0;
        const pB = PRIORITY_ORDER[(b.priority || '').toUpperCase()] || 0;
        return pA - pB;
      });
    } else {
      // Default: newest first
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Pagination
    if (page && limit) {
      const p = parseInt(page, 10) || 1;
      const l = parseInt(limit, 10) || 20;
      const total = list.length;
      const paginated = list.slice((p - 1) * l, p * l);
      return res.json({
        data: paginated,
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l)
      });
    }

    res.json(list);
  } catch (error) {
    console.error('getAllComplaints error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Admin mark grievance as reviewed (Module 6.13 - 6.14)
// @route   PUT /api/complaints/:id/review
// @access  Private (Admin only)
exports.markComplaintAsReviewed = async (req, res) => {
  try {
    const param = req.params.id;
    const { reviewNotes } = req.body || {};

    if (mongoose.connection.readyState === 1) {
      let query = { $or: [{ grievanceId: param }] };
      if (mongoose.Types.ObjectId.isValid(param)) {
        query.$or.push({ _id: param });
      }

      const complaint = await Complaint.findOne(query);
      if (!complaint) {
        return res.status(404).json({ message: 'Grievance not found' });
      }

      complaint.isReviewed = true;
      complaint.reviewedBy = req.user._id;
      complaint.reviewedAt = new Date();
      if (reviewNotes && typeof reviewNotes === 'string') {
        complaint.reviewNotes = reviewNotes.trim();
      }

      await complaint.save();

      // Record administrative review in history without changing redressing status or assigning officer
      await GrievanceHistory.create({
        grievanceId: complaint._id,
        status: complaint.status,
        remark: reviewNotes?.trim()
          ? `Administrative review completed by ${req.user.name}: "${reviewNotes.trim()}"`
          : `Grievance and AI recommendation reviewed by Administrator (${req.user.name}).`,
        changedBy: req.user._id,
        changedByRole: 'admin'
      });

      const updated = await Complaint.findById(complaint._id)
        .populate('userId', 'name email phone')
        .populate('assignedDepartment', 'name code')
        .populate('reviewedBy', 'name role');

      const history = await GrievanceHistory.find({ grievanceId: complaint._id })
        .populate('changedBy', 'name role')
        .sort({ createdAt: 1 });
      const aiAnalysis = await AIAnalysis.findOne({ grievanceId: complaint._id });

      const complaintObj = updated.toObject();
      complaintObj.history = history;
      complaintObj.aiAnalysis = aiAnalysis;

      return res.json(complaintObj);
    }

    // In-memory fallback
    const complaint = memoryStore.complaints.find(c =>
      c.grievanceId === param || c._id.toString() === param.toString()
    );

    if (!complaint) {
      return res.status(404).json({ message: 'Grievance not found' });
    }

    complaint.isReviewed = true;
    complaint.reviewedBy = req.user._id;
    complaint.reviewedAt = new Date();
    if (reviewNotes && typeof reviewNotes === 'string') {
      complaint.reviewNotes = reviewNotes.trim();
    }
    complaint.updatedAt = new Date();

    memoryStore.grievanceHistories.push({
      _id: memoryStore.generateId(),
      grievanceId: complaint._id,
      status: complaint.status,
      remark: reviewNotes?.trim()
        ? `Administrative review completed by ${req.user.name}: "${reviewNotes.trim()}"`
        : `Grievance and AI recommendation reviewed by Administrator (${req.user.name}).`,
      changedBy: req.user._id,
      changedByRole: 'admin',
      createdAt: new Date()
    });

    const populated = populateMemoryComplaint(complaint);
    populated.history = memoryStore.grievanceHistories
      .filter(h => h.grievanceId.toString() === populated._id.toString())
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    populated.aiAnalysis = memoryStore.aiAnalyses.find(
      a => a.grievanceId.toString() === populated._id.toString()
    ) || null;

    res.json(populated);
  } catch (error) {
    console.error('markComplaintAsReviewed error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get duplicate candidates for a complaint (Module 9.9)
// @route   GET /api/complaints/:id/duplicates
// @access  Private (Admin only)
exports.getComplaintDuplicates = async (req, res) => {
  try {
    const param = req.params.id;

    if (mongoose.connection.readyState === 1) {
      let query = { $or: [{ grievanceId: param }] };
      if (mongoose.Types.ObjectId.isValid(param)) {
        query.$or.push({ _id: param });
      }
      const complaint = await Complaint.findOne(query)
        .populate('duplicateCandidates.complaintId', 'title category location status priority grievanceId')
        .populate('confirmedDuplicateOf', 'title category location status priority grievanceId')
        .populate('duplicateReviewedBy', 'name role email');

      if (!complaint) {
        return res.status(404).json({ message: 'Grievance not found' });
      }

      return res.json({
        grievanceId: complaint.grievanceId,
        duplicateReviewStatus: complaint.duplicateReviewStatus || 'PENDING',
        duplicateCandidates: complaint.duplicateCandidates || [],
        confirmedDuplicateOf: complaint.confirmedDuplicateOf,
        duplicateReviewedBy: complaint.duplicateReviewedBy,
        duplicateReviewedAt: complaint.duplicateReviewedAt,
        duplicateReviewNote: complaint.duplicateReviewNote
      });
    }

    // In-memory fallback
    const complaint = memoryStore.complaints.find(c =>
      c.grievanceId === param || c._id.toString() === param.toString()
    );
    if (!complaint) {
      return res.status(404).json({ message: 'Grievance not found' });
    }

    const populated = populateMemoryComplaint(complaint);
    const enrichedCandidates = (populated.duplicateCandidates || []).map(cand => {
      const fullCand = memoryStore.complaints.find(c => c._id.toString() === (cand.complaintId?._id || cand.complaintId || '').toString());
      return {
        ...cand,
        complaintId: fullCand ? {
          _id: fullCand._id,
          grievanceId: fullCand.grievanceId,
          title: fullCand.title,
          category: fullCand.category,
          location: fullCand.location,
          status: fullCand.status,
          priority: fullCand.priority
        } : cand.complaintId
      };
    });

    const confirmedTarget = populated.confirmedDuplicateOf
      ? memoryStore.complaints.find(c => c._id.toString() === (populated.confirmedDuplicateOf?._id || populated.confirmedDuplicateOf || '').toString())
      : null;

    res.json({
      grievanceId: populated.grievanceId,
      duplicateReviewStatus: populated.duplicateReviewStatus || 'PENDING',
      duplicateCandidates: enrichedCandidates,
      confirmedDuplicateOf: confirmedTarget ? {
        _id: confirmedTarget._id,
        grievanceId: confirmedTarget.grievanceId,
        title: confirmedTarget.title,
        status: confirmedTarget.status
      } : populated.confirmedDuplicateOf,
      duplicateReviewedBy: populated.duplicateReviewedBy,
      duplicateReviewedAt: populated.duplicateReviewedAt,
      duplicateReviewNote: populated.duplicateReviewNote
    });
  } catch (error) {
    console.error('getComplaintDuplicates error:', error);
    res.status(500).json({ message: 'Server error retrieving duplicate candidates' });
  }
};

// @desc    Admin review and decision on duplicate grievance (Module 9.10 - 9.15)
// @route   PUT /api/complaints/:id/duplicate-review
// @access  Private (Admin only)
exports.reviewDuplicateComplaint = async (req, res) => {
  try {
    const param = req.params.id;
    const { decision, duplicateOf, reviewNote } = req.body || {};

    const validDecisions = ['CONFIRMED_DUPLICATE', 'NOT_DUPLICATE', 'PENDING'];
    if (!decision || !validDecisions.includes(decision)) {
      return res.status(400).json({
        message: `Invalid decision. Must be one of: ${validDecisions.join(', ')}`
      });
    }

    if (mongoose.connection.readyState === 1) {
      let query = { $or: [{ grievanceId: param }] };
      if (mongoose.Types.ObjectId.isValid(param)) {
        query.$or.push({ _id: param });
      }
      const complaint = await Complaint.findOne(query);
      if (!complaint) {
        return res.status(404).json({ message: 'Grievance not found' });
      }

      let targetComplaint = null;
      if (decision === 'CONFIRMED_DUPLICATE') {
        if (!duplicateOf) {
          return res.status(400).json({ message: 'Target duplicate grievance reference is required for confirmation' });
        }
        let dupQuery = { $or: [{ grievanceId: duplicateOf }] };
        if (mongoose.Types.ObjectId.isValid(duplicateOf)) {
          dupQuery.$or.push({ _id: duplicateOf });
        }
        targetComplaint = await Complaint.findOne(dupQuery);
        if (!targetComplaint) {
          return res.status(400).json({ message: `Target duplicate grievance "${duplicateOf}" not found` });
        }
        if (targetComplaint._id.toString() === complaint._id.toString()) {
          return res.status(400).json({ message: 'Grievance cannot be declared a duplicate of itself' });
        }
      }

      // Preserve existing operational status (Module 9.10: Do not change actual status)
      complaint.duplicateReviewStatus = decision;

      if (decision === 'CONFIRMED_DUPLICATE') {
        complaint.confirmedDuplicateOf = targetComplaint._id;
        complaint.isDuplicateOf = targetComplaint._id;
        complaint.duplicateReviewedBy = req.user._id;
        complaint.duplicateReviewedAt = new Date(); // Server generated
        complaint.duplicateReviewNote = reviewNote ? String(reviewNote).trim() : null;

        await GrievanceHistory.create({
          grievanceId: complaint._id,
          status: 'DUPLICATE_REVIEWED',
          remark: `Admin confirmed duplicate of ${targetComplaint.grievanceId || targetComplaint._id}${reviewNote ? `. Note: ${String(reviewNote).trim()}` : ''}`,
          changedBy: req.user._id,
          changedByRole: 'admin'
        });
      } else if (decision === 'NOT_DUPLICATE') {
        complaint.confirmedDuplicateOf = null;
        complaint.isDuplicateOf = null;
        complaint.duplicateReviewedBy = req.user._id;
        complaint.duplicateReviewedAt = new Date(); // Server generated
        complaint.duplicateReviewNote = reviewNote ? String(reviewNote).trim() : null;

        await GrievanceHistory.create({
          grievanceId: complaint._id,
          status: 'NOT_DUPLICATE',
          remark: `Admin marked grievance as not a duplicate${reviewNote ? `. Note: ${String(reviewNote).trim()}` : ''}`,
          changedBy: req.user._id,
          changedByRole: 'admin'
        });
      } else if (decision === 'PENDING') {
        complaint.confirmedDuplicateOf = null;
        complaint.isDuplicateOf = null;
        complaint.duplicateReviewedBy = null;
        complaint.duplicateReviewedAt = null;
        complaint.duplicateReviewNote = null;
      }

      await complaint.save();

      const updated = await Complaint.findById(complaint._id)
        .populate('userId', 'name email phone')
        .populate('assignedDepartment', 'name code')
        .populate('assignedOfficerId', 'name email role department')
        .populate('duplicateCandidates.complaintId', 'title category location status priority grievanceId')
        .populate('confirmedDuplicateOf', 'title category location status priority grievanceId')
        .populate('duplicateReviewedBy', 'name role');

      const history = await GrievanceHistory.find({ grievanceId: complaint._id })
        .populate('changedBy', 'name role')
        .sort({ createdAt: 1 });
      const aiAnalysis = await AIAnalysis.findOne({ grievanceId: complaint._id });

      const complaintObj = updated.toObject();
      complaintObj.history = history;
      complaintObj.aiAnalysis = aiAnalysis;

      return res.json(complaintObj);
    }

    // In-memory fallback
    const complaint = memoryStore.complaints.find(c =>
      c.grievanceId === param || c._id.toString() === param.toString()
    );
    if (!complaint) {
      return res.status(404).json({ message: 'Grievance not found' });
    }

    let targetComplaint = null;
    if (decision === 'CONFIRMED_DUPLICATE') {
      if (!duplicateOf) {
        return res.status(400).json({ message: 'Target duplicate grievance reference is required for confirmation' });
      }
      targetComplaint = memoryStore.complaints.find(c =>
        c.grievanceId === duplicateOf || c._id.toString() === duplicateOf.toString()
      );
      if (!targetComplaint) {
        return res.status(400).json({ message: `Target duplicate grievance "${duplicateOf}" not found` });
      }
      if (targetComplaint._id.toString() === complaint._id.toString()) {
        return res.status(400).json({ message: 'Grievance cannot be declared a duplicate of itself' });
      }
    }

    complaint.duplicateReviewStatus = decision;
    complaint.updatedAt = new Date();

    if (decision === 'CONFIRMED_DUPLICATE') {
      complaint.confirmedDuplicateOf = targetComplaint._id;
      complaint.isDuplicateOf = targetComplaint._id;
      complaint.duplicateReviewedBy = req.user._id;
      complaint.duplicateReviewedAt = new Date(); // Server generated
      complaint.duplicateReviewNote = reviewNote ? String(reviewNote).trim() : null;

      memoryStore.grievanceHistories.push({
        _id: memoryStore.generateId(),
        grievanceId: complaint._id,
        status: 'DUPLICATE_REVIEWED',
        remark: `Admin confirmed duplicate of ${targetComplaint.grievanceId || targetComplaint._id}${reviewNote ? `. Note: ${String(reviewNote).trim()}` : ''}`,
        changedBy: req.user._id,
        changedByRole: 'admin',
        createdAt: new Date()
      });
    } else if (decision === 'NOT_DUPLICATE') {
      complaint.confirmedDuplicateOf = null;
      complaint.isDuplicateOf = null;
      complaint.duplicateReviewedBy = req.user._id;
      complaint.duplicateReviewedAt = new Date(); // Server generated
      complaint.duplicateReviewNote = reviewNote ? String(reviewNote).trim() : null;

      memoryStore.grievanceHistories.push({
        _id: memoryStore.generateId(),
        grievanceId: complaint._id,
        status: 'NOT_DUPLICATE',
        remark: `Admin marked grievance as not a duplicate${reviewNote ? `. Note: ${String(reviewNote).trim()}` : ''}`,
        changedBy: req.user._id,
        changedByRole: 'admin',
        createdAt: new Date()
      });
    } else if (decision === 'PENDING') {
      complaint.confirmedDuplicateOf = null;
      complaint.isDuplicateOf = null;
      complaint.duplicateReviewedBy = null;
      complaint.duplicateReviewedAt = null;
      complaint.duplicateReviewNote = null;
    }

    const populated = populateMemoryComplaint(complaint);
    if (populated.duplicateCandidates) {
      populated.duplicateCandidates = populated.duplicateCandidates.map(cand => {
        const fullCand = memoryStore.complaints.find(comp => comp._id.toString() === (cand.complaintId?._id || cand.complaintId || '').toString());
        return {
          ...cand,
          complaintId: fullCand ? {
            _id: fullCand._id,
            grievanceId: fullCand.grievanceId,
            title: fullCand.title,
            category: fullCand.category,
            location: fullCand.location,
            status: fullCand.status,
            priority: fullCand.priority
          } : cand.complaintId
        };
      });
    }
    if (populated.confirmedDuplicateOf) {
      const fullTarget = memoryStore.complaints.find(comp => comp._id.toString() === (populated.confirmedDuplicateOf?._id || populated.confirmedDuplicateOf || '').toString());
      if (fullTarget) {
        populated.confirmedDuplicateOf = {
          _id: fullTarget._id,
          grievanceId: fullTarget.grievanceId,
          title: fullTarget.title,
          category: fullTarget.category,
          status: fullTarget.status
        };
      }
    }

    populated.history = memoryStore.grievanceHistories
      .filter(h => h.grievanceId.toString() === populated._id.toString())
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    populated.aiAnalysis = memoryStore.aiAnalyses.find(
      a => a.grievanceId.toString() === populated._id.toString()
    ) || null;

    res.json(populated);
  } catch (error) {
    console.error('reviewDuplicateComplaint error:', error);
    res.status(500).json({ message: 'Server error processing duplicate review' });
  }
};

/**
 * @desc    Get complaint evidence file (secure authenticated attachment retrieval)
 * @route   GET /api/complaints/:id/evidence/:fileId
 *          GET /api/complaints/:id/evidence
 *          GET /api/grievances/:id/evidence/:fileId
 * @access  Private (Citizen owner, assigned officer, department officer if unassigned, admin)
 */
exports.getComplaintEvidence = async (req, res) => {
  try {
    const { id, fileId } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Grievance ID parameter is required' });
    }

    let complaint = null;

    if (mongoose.connection.readyState === 1) {
      let query = { $or: [{ grievanceId: id }] };
      if (mongoose.Types.ObjectId.isValid(id)) {
        query.$or.push({ _id: id });
      }
      complaint = await Complaint.findOne(query)
        .populate('userId', '_id name email role')
        .populate('assignedDepartment', '_id name code')
        .populate('assignedOfficerId', '_id name email role department');
    } else {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ message: 'Database service is temporarily unavailable.' });
      }
      complaint = memoryStore.complaints.find(c =>
        c._id.toString() === id.toString() || c.grievanceId === id
      );
    }

    if (!complaint) {
      return res.status(404).json({ message: 'Grievance not found' });
    }

    // Role-based Access Authorization Check (Module 4, 7, and Evidence Privacy)
    const userRole = req.user.role;
    const userId = (req.user._id || '').toString();

    if (userRole === 'citizen') {
      const ownerId = (complaint.userId?._id || complaint.userId || '').toString();
      if (ownerId !== userId) {
        return res.status(403).json({ message: 'Forbidden: Access denied to evidence for this grievance' });
      }
    } else if (userRole === 'officer') {
      const officerDept = req.user.department ? (req.user.department._id || req.user.department).toString() : '';
      const complaintDept = complaint.assignedDepartment ? (complaint.assignedDepartment._id || complaint.assignedDepartment).toString() : '';
      const assignedOfficer = complaint.assignedOfficerId ? (complaint.assignedOfficerId._id || complaint.assignedOfficerId).toString() : null;

      if (assignedOfficer) {
        if (assignedOfficer !== userId) {
          return res.status(403).json({ message: 'Forbidden: You are not the assigned officer for this grievance' });
        }
      } else if (!complaintDept || officerDept !== complaintDept) {
        return res.status(403).json({ message: 'Forbidden: Restricted to assigned department complaints' });
      }
    } else if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Unauthorized role' });
    }

    // Find requested evidence file within complaint records
    // Sanitize requested fileId to prevent path traversal
    const rawRequestedId = fileId || 'primary';
    const sanitizedFileId = path.basename(rawRequestedId);

    let matchedAttachment = null;
    let targetFilename = null;

    if (complaint.attachments && complaint.attachments.length > 0) {
      matchedAttachment = complaint.attachments.find(a => {
        if (!a) return false;
        const fname = a.filename ? path.basename(a.filename) : '';
        const urlName = a.url ? path.basename(a.url) : '';
        const origName = a.originalName ? path.basename(a.originalName) : '';
        const subId = a._id ? a._id.toString() : '';
        return (
          fname === sanitizedFileId ||
          urlName === sanitizedFileId ||
          origName === sanitizedFileId ||
          subId === rawRequestedId
        );
      });
    }

    if (matchedAttachment) {
      targetFilename = matchedAttachment.url ? path.basename(matchedAttachment.url) : path.basename(matchedAttachment.filename);
    } else if (complaint.imageUrl) {
      const imgBase = path.basename(complaint.imageUrl);
      if (
        sanitizedFileId === 'primary' ||
        sanitizedFileId === 'image' ||
        sanitizedFileId === 'evidence' ||
        sanitizedFileId === imgBase
      ) {
        targetFilename = imgBase;
      }
    } else if (sanitizedFileId === 'primary' && complaint.attachments && complaint.attachments[0]) {
      const first = complaint.attachments[0];
      targetFilename = first.url ? path.basename(first.url) : path.basename(first.filename);
    }

    if (!targetFilename) {
      return res.status(404).json({ message: 'Evidence file not found on this grievance record' });
    }

    // Prevent Path Traversal strictly
    const safeFilename = path.basename(targetFilename);
    const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
    const absoluteFilePath = path.resolve(uploadsDir, safeFilename);

    // Verify path stays strictly within uploadsDir
    if (!absoluteFilePath.startsWith(uploadsDir + path.sep)) {
      return res.status(400).json({ message: 'Security validation failed: Invalid file path' });
    }

    if (!fs.existsSync(absoluteFilePath)) {
      return res.status(404).json({ message: 'Evidence file not found on server disk' });
    }

    // Determine MIME type
    const ext = path.extname(safeFilename).toLowerCase();
    const mimeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf'
    };
    const contentType = matchedAttachment?.mimetype || mimeMap[ext] || 'application/octet-stream';

    // Set HTTP Headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    const downloadName = matchedAttachment?.originalName || matchedAttachment?.filename || safeFilename;
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(downloadName)}"`);

    // Stream file to client
    const stream = fs.createReadStream(absoluteFilePath);
    stream.on('error', (err) => {
      console.error('Evidence streaming error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming evidence file' });
      }
    });
    return stream.pipe(res);
  } catch (error) {
    console.error('getComplaintEvidence error:', error);
    return res.status(500).json({ message: 'Server error retrieving evidence' });
  }
};

