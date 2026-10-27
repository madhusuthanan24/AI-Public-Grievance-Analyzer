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

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Health check route
  app.get('/api/health', (req, res) => {
    const isMongoConnected = require('mongoose').connection.readyState === 1;
    res.status(200).json({
      status: 'OK',
      database: isMongoConnected ? 'connected' : 'unavailable',
      storage: isMongoConnected ? 'mongodb' : 'memory',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API routers
  app.use('/api/auth', require('./backend/routes/authRoutes'));
  app.use('/api/complaints', require('./backend/routes/complaintRoutes'));
  app.use('/api/departments', require('./backend/routes/departmentRoutes'));
  app.use('/api/analytics', require('./backend/routes/analyticsRoutes'));

  // Mongoose, Multer & database fallback error middleware
  app.use((err, req, res, next) => {
    if (err && (err.name === 'MulterError' || (err.message && err.message.includes('file')))) {
      return res.status(400).json({ message: err.message || 'File upload validation error' });
    }
    if (err && (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || (err.message && err.message.includes('buffering timed out')))) {
      console.warn('[AI Studio] Database offline — returning fallback response');
      if (req.method === 'GET') {
        return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
      }
      return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
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
