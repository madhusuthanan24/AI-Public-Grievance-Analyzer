require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./backend/config/db');

async function startServer() {
  const app = express();

  // Connect Database (non-blocking fallback to in-memory store)
  await connectDB();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Basic Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Ensure persistent uploads directory exists
  const storageService = require('./backend/services/storageService');
  storageService.getUploadsDir();

  // Evidence Privacy: Block unrestricted static file serving of /uploads.
  // Direct file access is forbidden; evidence must be viewed via authenticated grievance API.
  app.use('/uploads', (req, res) => {
    res.status(403).json({
      message: 'Forbidden: Direct public access to uploaded evidence is disabled for citizen privacy. Please access evidence through the authenticated grievance API.'
    });
  });

  // Health check routes (both /api/health and /health)
  const healthHandler = (req, res) => {
    const isMongoConnected = require('mongoose').connection.readyState === 1;
    const storageDiag = storageService.getDiagnostics();
    res.status(200).json({
      status: 'OK',
      message: 'API is running',
      database: isMongoConnected ? 'connected' : 'unavailable',
      storage: isMongoConnected ? 'mongodb' : 'memory',
      evidenceStorage: storageDiag.provider,
      timestamp: new Date().toISOString()
    });
  };
  app.get('/api/health', healthHandler);
  app.get('/health', healthHandler);

  // In production, reject database-dependent API requests if MongoDB is offline instead of silent in-memory fallback
  app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();
    if (process.env.NODE_ENV === 'production') {
      const isConnected = require('mongoose').connection.readyState === 1;
      if (!isConnected) {
        console.error(`[Production Database Error] MongoDB disconnected during ${req.method} ${req.originalUrl}`);
        return res.status(503).json({
          message: 'Database service is temporarily unavailable. Please try again shortly.'
        });
      }
    }
    next();
  });

  // Mount API routers (primary canonical /api/* routes)
  app.use('/api/auth', require('./backend/routes/authRoutes'));
  app.use('/api/complaints', require('./backend/routes/complaintRoutes'));
  app.use('/api/grievances', require('./backend/routes/complaintRoutes'));
  app.use('/api/departments', require('./backend/routes/departmentRoutes'));
  app.use('/api/analytics', require('./backend/routes/analyticsRoutes'));

  // Backward compatibility aliases (without /api)
  app.use('/auth', require('./backend/routes/authRoutes'));
  app.use('/complaints', require('./backend/routes/complaintRoutes'));
  app.use('/grievances', require('./backend/routes/complaintRoutes'));
  app.use('/departments', require('./backend/routes/departmentRoutes'));
  app.use('/analytics', require('./backend/routes/analyticsRoutes'));

  // 404 handler for unmatched API requests
  app.all('/api/*', (req, res) => {
    res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Mongoose, Multer & database fallback error middleware
  app.use((err, req, res, next) => {
    if (err && (err.name === 'MulterError' || (err.message && err.message.includes('file')))) {
      return res.status(400).json({ message: err.message || 'File upload validation error' });
    }
    if (err && (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || (err.message && err.message.includes('buffering timed out')))) {
      console.error('[Database Error] Database operation failed:', err.message);
      return res.status(503).json({ message: 'Service temporarily unavailable (database offline). Please try again shortly.' });
    }
    if (err) {
      console.error('Unhandled server error:', err);
      return res.status(500).json({ message: err.message || 'Server error' });
    }
    next();
  });

  // Serve Frontend
  const isProduction = process.env.NODE_ENV === 'production';
  const distDir = path.join(__dirname, 'dist');

  const PORT = process.env.PORT || 3001;

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          host: '0.0.0.0',
          port: Number(PORT),
          hmr: false,
          watch: null
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('[AI Studio] Vite middleware mounted in dev mode');
    } catch (viteErr) {
      console.warn('[AI Studio] Vite dev middleware failed, checking for dist build:', viteErr.message);
      if (fs.existsSync(distDir)) {
        app.use(express.static(distDir));
        app.get('*', (req, res) => {
          res.sendFile(path.join(distDir, 'index.html'));
        });
      }
    }
  } else {
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[AI Studio] Port ${PORT} already in use. A process is already listening.`);
    } else {
      console.error('[AI Studio] Server error:', err);
    }
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
