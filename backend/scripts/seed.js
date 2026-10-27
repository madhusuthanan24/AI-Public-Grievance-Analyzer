require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Department = require('../models/Department');
const Complaint = require('../models/Complaint');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/grievance-analyzer');
    console.log(`MongoDB Connected for seeding: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

const departmentsToSeed = [
  { name: 'Road Maintenance Department', description: 'Handles repair of potholes, street markings, public spaces, and municipal roads.' },
  { name: 'Water Supply Department', description: 'Handles water contamination, pipeline leaks, pressure, and household supply issues.' },
  { name: 'Electricity Department', description: 'Handles faulty transformers, live wires exposure, streetlight repair, and outages.' },
  { name: 'Sanitation Department', description: 'Handles sewage overflow, trash container cleaning, public sanitation, and waste removal.' },
  { name: 'Healthcare Department', description: 'Handles medical waste disposal, public health hazards, and clinic upkeep.' },
  { name: 'Public Safety Department', description: 'Handles street vendor clearance, emergency setups, hazard prevention, and security.' }
];

const seedDB = async () => {
  try {
    await connectDB();

    // 1. Clear database
    console.log('Clearing database...');
    await User.deleteMany({});
    await Department.deleteMany({});
    await Complaint.deleteMany({});

    // 2. Create Departments
    console.log('Seeding departments...');
    const createdDepts = await Department.insertMany(departmentsToSeed);
    console.log(`Seeded ${createdDepts.length} departments.`);

    // 3. Create Admin Account
    console.log('Seeding default administrator...');
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('Admin@123456', salt);
    const adminUser = new User({
      name: 'Central Admin',
      email: 'admin@grievance.gov',
      password: adminPassword,
      role: 'admin'
    });
    await adminUser.save();
    console.log('Seeded Admin account: admin@grievance.gov / Admin@123456');

    // 4. Create Officers and link them
    console.log('Seeding department officers...');
    const officerDetails = [
      { name: 'Road Officer', email: 'road.officer@grievance.gov', deptName: 'Road Maintenance' },
      { name: 'Water Officer', email: 'water.officer@grievance.gov', deptName: 'Water Supply' },
      { name: 'Sanitation Officer', email: 'sanitation.officer@grievance.gov', deptName: 'Sanitation' }
    ];

    for (const off of officerDetails) {
      const dept = createdDepts.find(d => d.name.includes(off.deptName));
      if (dept) {
        const offPassword = await bcrypt.hash('Officer@123', salt);
        const officerUser = new User({
          name: off.name,
          email: off.email,
          password: offPassword,
          role: 'officer',
          department: dept._id
        });
        const savedOfficer = await officerUser.save();
        
        // Push user ID to department's officer list
        dept.officerIds.push(savedOfficer._id);
        await dept.save();
        console.log(`Seeded Officer: ${off.email} / Officer@123 -> assigned to ${dept.name}`);
      }
    }

    // 5. Create default Citizen Account for convenience
    console.log('Seeding test citizen account...');
    const citizenPassword = await bcrypt.hash('Citizen@123', salt);
    const citizenUser = new User({
      name: 'John Doe',
      email: 'citizen@temp.com',
      password: citizenPassword,
      role: 'citizen'
    });
    await citizenUser.save();
    console.log('Seeded Citizen account: citizen@temp.com / Citizen@123');

    console.log('Seeding database completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding critical failure:', err);
    process.exit(1);
  }
};

seedDB();
