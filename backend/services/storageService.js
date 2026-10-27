const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const mongoose = require('mongoose');

// Determine the persistent uploads directory
// Supports Render persistent disks (e.g. UPLOADS_DIR=/var/data/uploads or PERSISTENT_DIR=/var/data)
function getUploadsDir() {
  const envDir = process.env.UPLOADS_DIR || process.env.PERSISTENT_DIR;
  let resolvedDir;

  if (envDir && typeof envDir === 'string' && envDir.trim() !== '') {
    resolvedDir = path.resolve(envDir.trim());
  } else {
    // Default fallback to workspace uploads directory
    resolvedDir = path.resolve(__dirname, '..', '..', 'uploads');
  }

  try {
    if (!fs.existsSync(resolvedDir)) {
      fs.mkdirSync(resolvedDir, { recursive: true });
    }
  } catch (err) {
    console.warn(`[Storage Warning] Unable to create uploads directory at "${resolvedDir}":`, err.message);
  }

  return resolvedDir;
}

// Get GridFS bucket from active Mongoose connection
function getGridFSBucket() {
  if (
    mongoose.connection &&
    mongoose.connection.readyState === 1 &&
    mongoose.connection.db
  ) {
    try {
      return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'evidence'
      });
    } catch (err) {
      console.warn('[Storage Warning] Error initializing GridFS bucket:', err.message);
      return null;
    }
  }
  return null;
}

// Helper to deduce mime type from file extension
function getMimeType(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Saves an uploaded file to persistent storage:
 * 1. Permanently streams the binary to MongoDB Atlas GridFS (evidence bucket)
 * 2. Writes / keeps a copy on disk (in getUploadsDir())
 * 
 * @param {Object} file - Multer file object
 * @returns {Promise<{ provider: string, filename: string, gridFsId?: any }>}
 */
async function saveEvidenceFile(file) {
  if (!file) {
    throw new Error('No file provided to saveEvidenceFile');
  }

  const filename = path.basename(file.filename || file.originalname);
  const originalname = file.originalname || filename;
  const mimetype = file.mimetype || getMimeType(filename);
  const size = file.size || 0;
  const uploadsDir = getUploadsDir();
  const diskPath = path.resolve(uploadsDir, filename);

  // 1. Ensure file exists on disk
  if (file.path && path.resolve(file.path) !== diskPath) {
    try {
      if (fs.existsSync(file.path)) {
        fs.copyFileSync(file.path, diskPath);
      }
    } catch (copyErr) {
      console.warn(`[Storage] Non-fatal disk copy warning:`, copyErr.message);
    }
  } else if (file.buffer && !fs.existsSync(diskPath)) {
    try {
      fs.writeFileSync(diskPath, file.buffer);
    } catch (writeErr) {
      console.warn(`[Storage] Non-fatal disk write warning:`, writeErr.message);
    }
  }

  // 2. Commit permanently to MongoDB Atlas GridFS
  const bucket = getGridFSBucket();
  let gridFsId = null;

  if (bucket) {
    try {
      // Check if file already exists in GridFS to avoid orphan duplicates
      const existing = await bucket.find({ filename }).limit(1).toArray();
      if (existing.length > 0) {
        // Delete previous version if re-uploading same filename
        try {
          await bucket.delete(existing[0]._id);
        } catch (_) {}
      }

      const uploadStream = bucket.openUploadStream(filename, {
        metadata: {
          originalname,
          mimetype,
          size,
          uploadedAt: new Date()
        }
      });

      gridFsId = uploadStream.id;

      let sourceStream;
      if (file.buffer) {
        sourceStream = Readable.from(file.buffer);
      } else if (file.path && fs.existsSync(file.path)) {
        sourceStream = fs.createReadStream(file.path);
      } else if (fs.existsSync(diskPath)) {
        sourceStream = fs.createReadStream(diskPath);
      }

      if (sourceStream) {
        await new Promise((resolve, reject) => {
          sourceStream.pipe(uploadStream)
            .on('finish', resolve)
            .on('error', reject);
        });
        console.log(`[Evidence Storage] Saved "${filename}" to MongoDB Atlas GridFS (id: ${gridFsId}) and persistent disk`);
      }
    } catch (gridErr) {
      console.warn(`[Evidence Storage Warning] GridFS save error for "${filename}":`, gridErr.message);
    }
  } else {
    console.log(`[Evidence Storage] Saved "${filename}" to local disk (${diskPath})`);
  }

  return {
    provider: bucket ? 'gridfs+disk' : 'disk',
    filename,
    gridFsId,
    uploadsDir
  };
}

/**
 * Retrieves an evidence stream from persistent storage:
 * Checks MongoDB Atlas GridFS first, then persistent disk.
 * 
 * @param {string} targetFilename - File name to retrieve
 * @returns {Promise<{ stream: NodeJS.ReadableStream, mimetype: string, originalName: string, size: number, source: string } | null>}
 */
async function getEvidenceStream(targetFilename) {
  if (!targetFilename) return null;
  const safeFilename = path.basename(targetFilename);

  // 1. Check MongoDB Atlas GridFS first (survives all Render restarts and ephemeral wipes)
  const bucket = getGridFSBucket();
  if (bucket) {
    try {
      const files = await bucket.find({ filename: safeFilename }).limit(1).toArray();
      if (files && files.length > 0) {
        const fileDoc = files[0];
        const stream = bucket.openDownloadStreamByName(safeFilename);
        return {
          stream,
          mimetype: fileDoc.metadata?.mimetype || getMimeType(safeFilename),
          originalName: fileDoc.metadata?.originalname || safeFilename,
          size: fileDoc.length,
          source: 'gridfs'
        };
      }
    } catch (gridErr) {
      console.warn(`[Evidence Storage Warning] GridFS query error for "${safeFilename}":`, gridErr.message);
    }
  }

  // 2. Check Persistent Disk
  const uploadsDir = getUploadsDir();
  const diskPath = path.resolve(uploadsDir, safeFilename);

  // Strict path traversal validation
  if (diskPath.startsWith(uploadsDir + path.sep) && fs.existsSync(diskPath)) {
    try {
      const stat = fs.statSync(diskPath);
      if (stat.isFile()) {
        const stream = fs.createReadStream(diskPath);

        // Opportunistic background sync: if bucket is connected but file was only on disk, sync it to GridFS
        if (bucket) {
          saveEvidenceFile({
            filename: safeFilename,
            originalname: safeFilename,
            mimetype: getMimeType(safeFilename),
            size: stat.size,
            path: diskPath
          }).catch(() => {});
        }

        return {
          stream,
          mimetype: getMimeType(safeFilename),
          originalName: safeFilename,
          size: stat.size,
          source: 'disk'
        };
      }
    } catch (diskErr) {
      console.warn(`[Evidence Storage Warning] Disk read error for "${safeFilename}":`, diskErr.message);
    }
  }

  // 3. File not found in either storage location
  return null;
}

/**
 * Safe backend diagnostics logging without leaking secrets, tokens, or PII
 */
function getDiagnostics() {
  const bucket = getGridFSBucket();
  const uploadsDir = getUploadsDir();
  const isMongo = mongoose.connection && mongoose.connection.readyState === 1;

  return {
    provider: bucket ? 'MongoDB Atlas GridFS + Persistent Disk' : 'Local Disk',
    gridFsBucket: bucket ? 'evidence' : 'unavailable',
    databaseConnected: Boolean(isMongo),
    configuredUploadsDir: uploadsDir,
    hasCustomUploadsDir: Boolean(process.env.UPLOADS_DIR || process.env.PERSISTENT_DIR)
  };
}

/**
 * Retrieves an evidence file as a Buffer (useful for multimodal AI analysis)
 * @param {string} targetFilename
 * @returns {Promise<{ buffer: Buffer, mimetype: string, originalName: string, size: number } | null>}
 */
async function getEvidenceBuffer(targetFilename) {
  const result = await getEvidenceStream(targetFilename);
  if (!result || !result.stream) return null;

  try {
    const chunks = [];
    for await (const chunk of result.stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    return {
      buffer,
      mimetype: result.mimetype,
      originalName: result.originalName,
      size: buffer.length
    };
  } catch (err) {
    console.warn(`[Evidence Storage Warning] Buffer read error for "${targetFilename}":`, err.message);
    return null;
  }
}

/**
 * Safely deletes an evidence file from persistent storage (MongoDB Atlas GridFS and local disk).
 * 
 * @param {string} targetFilename - File name to remove
 * @returns {Promise<boolean>}
 */
async function deleteEvidenceFile(targetFilename) {
  if (!targetFilename) return false;
  const safeFilename = path.basename(targetFilename);

  // 1. Delete from GridFS bucket
  const bucket = getGridFSBucket();
  if (bucket) {
    try {
      const files = await bucket.find({ filename: safeFilename }).toArray();
      for (const f of files) {
        await bucket.delete(f._id);
        console.log(`[Evidence Storage] Deleted GridFS file: "${safeFilename}" (id: ${f._id})`);
      }
    } catch (gridErr) {
      console.warn(`[Evidence Storage Warning] GridFS delete error for "${safeFilename}":`, gridErr.message);
    }
  }

  // 2. Delete from persistent disk
  const uploadsDir = getUploadsDir();
  const diskPath = path.resolve(uploadsDir, safeFilename);

  // Path traversal guard
  if (diskPath.startsWith(uploadsDir + path.sep) && fs.existsSync(diskPath)) {
    try {
      fs.unlinkSync(diskPath);
      console.log(`[Evidence Storage] Deleted disk file: "${diskPath}"`);
    } catch (diskErr) {
      console.warn(`[Evidence Storage Warning] Disk unlink error for "${safeFilename}":`, diskErr.message);
    }
  }

  return true;
}

module.exports = {
  getUploadsDir,
  getGridFSBucket,
  saveEvidenceFile,
  getEvidenceStream,
  getEvidenceBuffer,
  deleteEvidenceFile,
  getDiagnostics,
  getMimeType
};
