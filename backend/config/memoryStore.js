const bcrypt = require('bcryptjs');

const salt = bcrypt.genSaltSync(10);
const adminPasswordHash = bcrypt.hashSync('Admin@123456', salt);
const officerPasswordHash = bcrypt.hashSync('Officer@123', salt);
const citizenPasswordHash = bcrypt.hashSync('Citizen@123', salt);

const departments = [
  {
    _id: '661ad1100000000000000001',
    name: 'Road Maintenance Department',
    code: 'ROAD',
    description: 'Handles repair of potholes, street markings, public spaces, and municipal roads.',
    active: true,
    officerIds: ['661ad2200000000000000002'],
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },
  {
    _id: '661ad1100000000000000002',
    name: 'Water Supply Department',
    code: 'WATR',
    description: 'Handles water contamination, pipeline leaks, pressure, and household supply issues.',
    active: true,
    officerIds: ['661ad2200000000000000003'],
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },
  {
    _id: '661ad1100000000000000003',
    name: 'Electricity Department',
    code: 'ELEC',
    description: 'Handles faulty transformers, live wires exposure, streetlight repair, and outages.',
    active: true,
    officerIds: [],
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },
  {
    _id: '661ad1100000000000000004',
    name: 'Sanitation Department',
    code: 'SANI',
    description: 'Handles sewage overflow, trash container cleaning, public sanitation, and waste removal.',
    active: true,
    officerIds: ['661ad2200000000000000004'],
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },
  {
    _id: '661ad1100000000000000005',
    name: 'Healthcare Department',
    code: 'HLTH',
    description: 'Handles medical waste disposal, public health hazards, and clinic upkeep.',
    active: true,
    officerIds: [],
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },
  {
    _id: '661ad1100000000000000006',
    name: 'Public Safety Department',
    code: 'SAFE',
    description: 'Handles street vendor clearance, emergency setups, hazard prevention, and security.',
    active: true,
    officerIds: [],
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  }
];

const users = [
  {
    _id: '661ad2200000000000000001',
    name: 'Central Admin',
    email: 'admin@grievance.gov',
    password: adminPasswordHash,
    phone: '+1 555-0199',
    role: 'admin',
    department: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },
  {
    _id: '661ad2200000000000000002',
    name: 'Road Officer',
    email: 'road.officer@grievance.gov',
    password: officerPasswordHash,
    phone: '+1 555-0200',
    role: 'officer',
    department: '661ad1100000000000000001',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },
  {
    _id: '661ad2200000000000000003',
    name: 'Water Officer',
    email: 'water.officer@grievance.gov',
    password: officerPasswordHash,
    phone: '+1 555-0201',
    role: 'officer',
    department: '661ad1100000000000000002',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },
  {
    _id: '661ad2200000000000000004',
    name: 'Sanitation Officer',
    email: 'sanitation.officer@grievance.gov',
    password: officerPasswordHash,
    phone: '+1 555-0202',
    role: 'officer',
    department: '661ad1100000000000000004',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },
  {
    _id: '661ad2200000000000000005',
    name: 'John Doe',
    email: 'citizen@temp.com',
    password: citizenPasswordHash,
    phone: '+1 555-0300',
    role: 'citizen',
    department: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  }
];

const complaints = [
  {
    _id: '661ad3300000000000000001',
    grievanceId: 'GRV-2026-000101',
    userId: '661ad2200000000000000005',
    title: 'Severe pothole near 5th Cross Junction',
    description: 'Large pothole on the main transit road creating severe traffic delays and bike hazards.',
    category: 'Road Maintenance',
    priority: 'High',
    location: '5th Cross Junction, Main Commercial Road',
    imageUrl: null,
    attachments: [],
    assignedDepartment: '661ad1100000000000000001',
    assignedOfficerId: '661ad2200000000000000002',
    status: 'In Progress',
    isDuplicateOf: null,
    duplicateCandidates: [],
    duplicateReviewStatus: 'PENDING',
    confirmedDuplicateOf: null,
    duplicateReviewedBy: null,
    duplicateReviewedAt: null,
    duplicateReviewNote: null,
    aiSummary: 'Damaged pavement creating severe vehicle and pedestrian safety hazards on 5th Cross.',
    aiReason: 'Direct traffic bottleneck and high accident risk for two-wheelers.',
    aiConfidence: 0.94,
    aiRecommendedAction: 'Deploy asphalt road crew for hot-mix patch repair.',
    aiExtractedEntities: {
      location: '5th Cross Junction, Main Commercial Road',
      issue: 'Severe road pothole',
      service: 'Road Infrastructure',
      date: 'Recent'
    },
    remarks: [
      {
        text: 'Inspected the site; road maintenance team dispatched for asphalt patch.',
        officerId: '661ad2200000000000000002',
        date: new Date(Date.now() - 3600000 * 24)
      }
    ],
    createdAt: new Date(Date.now() - 3600000 * 48),
    updatedAt: new Date(Date.now() - 3600000 * 24)
  },
  {
    _id: '661ad3300000000000000002',
    grievanceId: 'GRV-2026-000102',
    userId: '661ad2200000000000000005',
    title: 'Water pipeline leakage on Sector 4',
    description: 'Drinking water pipe has burst and water is flooding the walkway since morning.',
    category: 'Water Supply',
    priority: 'High',
    location: 'Sector 4, Park Avenue',
    imageUrl: null,
    attachments: [],
    assignedDepartment: '661ad1100000000000000002',
    assignedOfficerId: '661ad2200000000000000003',
    status: 'Resolved',
    isDuplicateOf: null,
    duplicateCandidates: [],
    duplicateReviewStatus: 'PENDING',
    confirmedDuplicateOf: null,
    duplicateReviewedBy: null,
    duplicateReviewedAt: null,
    duplicateReviewNote: null,
    aiSummary: 'Burst potable water conduit flooding pedestrian walkways in Sector 4.',
    aiReason: 'Continuous loss of treated municipal water and pedestrian pathway impediment.',
    aiConfidence: 0.91,
    aiRecommendedAction: 'Isolate main isolation valve and replace damaged pipe section.',
    aiExtractedEntities: {
      location: 'Sector 4, Park Avenue',
      issue: 'Burst pipe & flooding',
      service: 'Potable Water Distribution',
      date: 'Morning'
    },
    remarks: [
      {
        text: 'Valve replaced and pressure restored to normal.',
        officerId: '661ad2200000000000000003',
        date: new Date(Date.now() - 3600000 * 12)
      }
    ],
    createdAt: new Date(Date.now() - 3600000 * 36),
    updatedAt: new Date(Date.now() - 3600000 * 12)
  },
  {
    _id: '661ad3300000000000000003',
    grievanceId: 'GRV-2026-000103',
    userId: '661ad2200000000000000005',
    title: 'Overflowing public dustbin near Market Gate',
    description: 'Garbage has not been cleared for 3 days and is spilling onto the roadway.',
    category: 'Sanitation',
    priority: 'Medium',
    location: 'Market Gate 2, Old Bazaar',
    imageUrl: null,
    attachments: [],
    assignedDepartment: '661ad1100000000000000004',
    assignedOfficerId: '661ad2200000000000000004',
    status: 'Under Review',
    isDuplicateOf: null,
    duplicateCandidates: [],
    duplicateReviewStatus: 'PENDING',
    confirmedDuplicateOf: null,
    duplicateReviewedBy: null,
    duplicateReviewedAt: null,
    duplicateReviewNote: null,
    aiSummary: 'Uncollected refuse bin accumulating street waste near Market Gate 2.',
    aiReason: 'Sanitation violation and odor nuisance in commercial shopping zone.',
    aiConfidence: 0.88,
    aiRecommendedAction: 'Dispatch waste collection compactor and sanitize area.',
    aiExtractedEntities: {
      location: 'Market Gate 2, Old Bazaar',
      issue: 'Overflowing waste container',
      service: 'Solid Waste Management',
      date: '3 days accumulated'
    },
    remarks: [],
    createdAt: new Date(Date.now() - 3600000 * 8),
    updatedAt: new Date(Date.now() - 3600000 * 8)
  }
];

const grievanceHistories = [
  {
    _id: '661ad4400000000000000001',
    grievanceId: '661ad3300000000000000001',
    status: 'In Progress',
    remark: 'Inspected the site; road maintenance team dispatched for asphalt patch.',
    changedBy: '661ad2200000000000000002',
    changedByRole: 'officer',
    createdAt: new Date(Date.now() - 3600000 * 24)
  },
  {
    _id: '661ad4400000000000000002',
    grievanceId: '661ad3300000000000000002',
    status: 'Resolved',
    remark: 'Valve replaced and pressure restored to normal.',
    changedBy: '661ad2200000000000000003',
    changedByRole: 'officer',
    createdAt: new Date(Date.now() - 3600000 * 12)
  }
];

const aiAnalyses = [
  {
    _id: '661ad5500000000000000001',
    grievanceId: '661ad3300000000000000001',
    category: 'Roads',
    department: 'Road Maintenance',
    priority: 'HIGH',
    summary: 'Damaged pavement creating severe vehicle and pedestrian safety hazards on 5th Cross.',
    reason: 'Direct traffic bottleneck and high accident risk for two-wheelers.',
    recommendedAction: 'Deploy asphalt road crew for hot-mix patch repair.',
    confidence: 0.94,
    extractedEntities: {
      location: '5th Cross Junction, Main Commercial Road',
      issue: 'Severe road pothole',
      service: 'Road Infrastructure',
      date: 'Recent'
    },
    analyzedAt: new Date(Date.now() - 3600000 * 48)
  },
  {
    _id: '661ad5500000000000000002',
    grievanceId: '661ad3300000000000000002',
    category: 'Water Supply',
    department: 'Water Supply',
    priority: 'HIGH',
    summary: 'Burst potable water conduit flooding pedestrian walkways in Sector 4.',
    reason: 'Continuous loss of treated municipal water and pedestrian pathway impediment.',
    recommendedAction: 'Isolate main isolation valve and replace damaged pipe section.',
    confidence: 0.91,
    extractedEntities: {
      location: 'Sector 4, Park Avenue',
      issue: 'Burst pipe & flooding',
      service: 'Potable Water Distribution',
      date: 'Morning'
    },
    analyzedAt: new Date(Date.now() - 3600000 * 36)
  },
  {
    _id: '661ad5500000000000000003',
    grievanceId: '661ad3300000000000000003',
    category: 'Sanitation',
    department: 'Sanitation',
    priority: 'MEDIUM',
    summary: 'Uncollected refuse bin accumulating street waste near Market Gate 2.',
    reason: 'Sanitation violation and odor nuisance in commercial shopping zone.',
    recommendedAction: 'Dispatch waste collection compactor and sanitize area.',
    confidence: 0.88,
    extractedEntities: {
      location: 'Market Gate 2, Old Bazaar',
      issue: 'Overflowing waste container',
      service: 'Solid Waste Management',
      date: '3 days accumulated'
    },
    analyzedAt: new Date(Date.now() - 3600000 * 8)
  }
];

let idCounter = 100;
const generateId = () => `mem_${Date.now()}_${++idCounter}`;
const generateGrievanceId = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `GRV-${year}-${rand}`;
};

module.exports = {
  departments,
  users,
  complaints,
  grievanceHistories,
  aiAnalyses,
  generateId,
  generateGrievanceId
};
