const express = require('express');
const router = express.Router();
const {
  submitComplaint,
  getMyComplaints,
  getComplaintById,
  getComplaintEvidence,
  getDepartmentComplaints,
  getOfficerComplaints,
  assignComplaint,
  updateComplaintStatus,
  addComplaintRemark,
  getAllComplaints,
  markComplaintAsReviewed,
  getComplaintDuplicates,
  reviewDuplicateComplaint
} = require('../controllers/complaintController');
const Complaint = require('../models/Complaint');
const GrievanceHistory = require('../models/GrievanceHistory');
const memoryStore = require('../config/memoryStore');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

// All complaint routes require auth
router.use(auth);

// Citizen routes (Module 5.1)
router.post('/', roleCheck(['citizen']), upload.single('image'), submitComplaint);
router.get('/my', roleCheck(['citizen']), getMyComplaints);

// Officer specific routes (Module 7.14)
router.get('/officer', roleCheck(['officer']), getOfficerComplaints);
router.get('/department', roleCheck(['officer']), getDepartmentComplaints);

// Shared Admin/Officer actions
router.put('/:id/status', roleCheck(['officer', 'admin']), updateComplaintStatus);
router.post('/:id/remarks', roleCheck(['officer', 'admin']), addComplaintRemark);

// Grievance History Sub-route (searchable by ObjectId or Grievance Tracking ID)
router.get('/:id/history', roleCheck(['citizen', 'officer', 'admin']), async (req, res) => {
  try {
    const param = req.params.id;
    if (mongoose.connection.readyState === 1) {
      let queryId = param;
      if (!mongoose.Types.ObjectId.isValid(param)) {
        const comp = await Complaint.findOne({ grievanceId: param });
        if (comp) queryId = comp._id;
      }
      const history = await GrievanceHistory.find({ grievanceId: queryId })
        .populate('changedBy', 'name role')
        .sort({ createdAt: 1 });
      return res.json(history);
    }

    // In-memory fallback
    let targetId = param;
    const comp = memoryStore.complaints.find(c => c.grievanceId === param || c._id.toString() === param.toString());
    if (comp) targetId = comp._id;

    const history = memoryStore.grievanceHistories.filter(
      h => h.grievanceId.toString() === targetId.toString()
    ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving history' });
  }
});

// Admin routes (Module 6.2, 6.3, 6.13 - 6.15 & Module 7.8)
router.get('/admin', roleCheck(['admin']), getAllComplaints);
router.get('/', roleCheck(['admin']), getAllComplaints);
router.put('/:id/review', roleCheck(['admin']), markComplaintAsReviewed);
router.put('/:id/assign', roleCheck(['admin']), assignComplaint);

// Module 9: Duplicate Detection & Administrative Decision Routes (Admin only)
router.get('/:id/duplicates', roleCheck(['admin']), getComplaintDuplicates);
router.put('/:id/duplicate-review', roleCheck(['admin']), reviewDuplicateComplaint);

// Evidence retrieval routes (Module 5.22 - Secure authenticated attachment retrieval)
router.get('/:id/evidence/:fileId', roleCheck(['citizen', 'officer', 'admin']), getComplaintEvidence);
router.get('/:id/evidence', roleCheck(['citizen', 'officer', 'admin']), getComplaintEvidence);

// Detail route (by _id or grievanceId)
router.get('/:id', roleCheck(['citizen', 'officer', 'admin']), getComplaintById);

module.exports = router;
