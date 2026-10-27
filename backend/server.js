require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure persistent uploads directory exists
const storageService = require('./services/storageService');
storageService.getUploadsDir();

app.use('/uploads', (req, res) => {
  res.status(403).json({
    message: 'Forbidden: Direct public access to uploaded evidence is disabled for citizen privacy. Please access evidence through the authenticated grievance API.'
  });
});

// Basic Route
app.get('/api/health', (req, res) => {
  const storageDiag = storageService.getDiagnostics();
  res.status(200).json({ status: 'OK', message: 'API is running', evidenceStorage: storageDiag.provider });
});

// Import and mount routers (we will define these next)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/grievances', require('./routes/complaintRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
