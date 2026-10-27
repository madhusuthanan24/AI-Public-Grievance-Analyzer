const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const memoryStore = require('../config/memoryStore');

// @desc    Get analytics summary
// @route   GET /api/analytics/summary
// @access  Private (Admin)
exports.getSummary = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      // 1. Basic Status Counts (using facet)
      const countsResult = await Complaint.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            resolved: [{ $match: { status: 'Resolved' } }, { $count: 'count' }],
            pending: [{ $match: { status: { $ne: 'Resolved' } } }, { $count: 'count' }]
          }
        }
      ]);

      const totalCount = countsResult[0]?.total[0]?.count || 0;
      const resolvedCount = countsResult[0]?.resolved[0]?.count || 0;
      const pendingCount = countsResult[0]?.pending[0]?.count || 0;

      // 2. Average Resolution Time overall (in hours)
      const overallAvgTime = await Complaint.aggregate([
        { $match: { status: 'Resolved' } },
        {
          $project: {
            durationMs: { $subtract: ['$updatedAt', '$createdAt'] }
          }
        },
        {
          $group: {
            _id: null,
            avgDurationMs: { $avg: '$durationMs' }
          }
        }
      ]);

      const avgResolutionTimeMs = overallAvgTime[0]?.avgDurationMs || 0;
      const avgResolutionTimeHours = avgResolutionTimeMs / (1000 * 60 * 60);

      // 3. Category Distribution
      const categoryDistribution = await Complaint.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            category: '$_id',
            count: 1,
            _id: 0
          }
        },
        { $sort: { count: -1 } }
      ]);

      // 4. Department Performance (average resolution time per department in hours)
      const departmentPerformance = await Complaint.aggregate([
        { $match: { status: 'Resolved', assignedDepartment: { $ne: null } } },
        {
          $project: {
            assignedDepartment: 1,
            durationMs: { $subtract: ['$updatedAt', '$createdAt'] }
          }
        },
        {
          $group: {
            _id: '$assignedDepartment',
            avgDurationMs: { $avg: '$durationMs' },
            resolvedCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'departments',
            localField: '_id',
            foreignField: '_id',
            as: 'dept'
          }
        },
        { $unwind: '$dept' },
        {
          $project: {
            departmentId: '$_id',
            departmentName: '$dept.name',
            avgResolutionTimeHours: { $divide: ['$avgDurationMs', 1000 * 60 * 60] },
            resolvedCount: 1,
            _id: 0
          }
        },
        { $sort: { departmentName: 1 } }
      ]);

      // 5. Monthly Trend (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      const monthlyTrendRaw = await Complaint.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyTrend = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const year = d.getFullYear();
        const monthNum = d.getMonth() + 1;
        const monthLabel = `${months[d.getMonth()]} ${year}`;

        const matched = monthlyTrendRaw.find(m => m._id.year === year && m._id.month === monthNum);
        monthlyTrend.push({
          month: monthLabel,
          count: matched ? matched.count : 0
        });
      }

      return res.json({
        summary: {
          totalCount,
          pendingCount,
          resolvedCount,
          avgResolutionTimeHours: parseFloat(avgResolutionTimeHours.toFixed(2))
        },
        categoryDistribution,
        departmentPerformance,
        monthlyTrend
      });
    }

    // --- In-memory analytics fallback ---
    const allComplaints = memoryStore.complaints;
    const totalCount = allComplaints.length;
    const resolved = allComplaints.filter(c => c.status === 'Resolved');
    const resolvedCount = resolved.length;
    const pendingCount = totalCount - resolvedCount;

    let totalDurationMs = 0;
    resolved.forEach(c => {
      const start = new Date(c.createdAt).getTime();
      const end = new Date(c.updatedAt || c.createdAt).getTime();
      totalDurationMs += Math.max(0, end - start);
    });
    const avgResolutionTimeHours = resolvedCount > 0 ? (totalDurationMs / resolvedCount) / (1000 * 60 * 60) : 0;

    // Category distribution
    const catMap = {};
    allComplaints.forEach(c => {
      catMap[c.category] = (catMap[c.category] || 0) + 1;
    });
    const categoryDistribution = Object.entries(catMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Department performance
    const deptPerfMap = {};
    resolved.forEach(c => {
      const deptId = (c.assignedDepartment?._id || c.assignedDepartment || '').toString();
      if (!deptId) return;
      if (!deptPerfMap[deptId]) {
        const dept = memoryStore.departments.find(d => d._id.toString() === deptId);
        deptPerfMap[deptId] = {
          departmentId: deptId,
          departmentName: dept ? dept.name : 'Unknown Department',
          totalDurationMs: 0,
          resolvedCount: 0
        };
      }
      const start = new Date(c.createdAt).getTime();
      const end = new Date(c.updatedAt || c.createdAt).getTime();
      deptPerfMap[deptId].totalDurationMs += Math.max(0, end - start);
      deptPerfMap[deptId].resolvedCount += 1;
    });

    const departmentPerformance = Object.values(deptPerfMap).map(d => ({
      departmentId: d.departmentId,
      departmentName: d.departmentName,
      avgResolutionTimeHours: parseFloat(((d.totalDurationMs / d.resolvedCount) / (1000 * 60 * 60)).toFixed(2)),
      resolvedCount: d.resolvedCount
    }));

    // Monthly trend
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const monthLabel = `${months[monthIndex]} ${year}`;

      const count = allComplaints.filter(c => {
        const cd = new Date(c.createdAt);
        return cd.getFullYear() === year && cd.getMonth() === monthIndex;
      }).length;

      monthlyTrend.push({
        month: monthLabel,
        count
      });
    }

    res.json({
      summary: {
        totalCount,
        pendingCount,
        resolvedCount,
        avgResolutionTimeHours: parseFloat(avgResolutionTimeHours.toFixed(2))
      },
      categoryDistribution,
      departmentPerformance,
      monthlyTrend
    });
  } catch (error) {
    console.error('Analytics Fetch Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
