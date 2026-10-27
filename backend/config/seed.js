const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const Complaint = require('../models/Complaint');
const GrievanceHistory = require('../models/GrievanceHistory');
const AIAnalysis = require('../models/AIAnalysis');
const memoryStore = require('./memoryStore');

/**
 * Idempotent seeder: Seeds baseline departments, administrative users,
 * and sample grievances into MongoDB if not already present.
 */
async function seedMongoDB() {
  try {
    if (mongoose.connection.readyState !== 1) return;

    // 1. Seed Departments
    for (const d of memoryStore.departments) {
      const exists = await Department.findOne({ name: d.name });
      if (!exists) {
        await Department.create({
          _id: d._id,
          name: d.name,
          code: d.code,
          description: d.description,
          active: d.active
        });
      }
    }

    // 2. Seed Users
    for (const u of memoryStore.users) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create({
          _id: u._id,
          name: u.name,
          email: u.email,
          password: u.password,
          phone: u.phone,
          role: u.role,
          department: u.department
        });
      }
    }

    // 3. Link Department Officers
    for (const d of memoryStore.departments) {
      if (d.officerIds && d.officerIds.length > 0) {
        await Department.findByIdAndUpdate(d._id, {
          $addToSet: { officerIds: { $each: d.officerIds } }
        });
      }
    }

    // 4. Seed Complaints
    for (const c of memoryStore.complaints) {
      const exists = await Complaint.findById(c._id);
      if (!exists) {
        await Complaint.create({
          _id: c._id,
          grievanceId: c.grievanceId,
          userId: c.userId,
          title: c.title,
          description: c.description,
          category: c.category,
          priority: c.priority,
          location: c.location,
          assignedDepartment: c.assignedDepartment,
          assignedOfficerId: c.assignedOfficerId,
          status: c.status,
          aiSummary: c.aiSummary,
          aiReason: c.aiReason,
          aiConfidence: c.aiConfidence,
          aiRecommendedAction: c.aiRecommendedAction,
          aiExtractedEntities: c.aiExtractedEntities,
          remarks: c.remarks,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt
        });

        // Seed corresponding AI analysis
        const aiExists = await AIAnalysis.findOne({ grievanceId: c._id });
        if (!aiExists) {
          await AIAnalysis.create({
            grievanceId: c._id,
            category: c.category,
            department: c.category,
            priority: c.priority,
            summary: c.aiSummary,
            reason: c.aiReason,
            recommendedAction: c.aiRecommendedAction,
            confidence: c.aiConfidence,
            extractedEntities: c.aiExtractedEntities,
            analyzedAt: c.createdAt
          });
        }
      }
    }

    // 5. Seed Grievance Histories
    for (const h of memoryStore.grievanceHistories) {
      const exists = await GrievanceHistory.findById(h._id);
      if (!exists) {
        await GrievanceHistory.create(h);
      }
    }

    console.log('[AI Studio] MongoDB baseline seed verified & synced.');
  } catch (err) {
    console.warn('[AI Studio] Seed check completed with note:', err.message);
  }
}

module.exports = seedMongoDB;
