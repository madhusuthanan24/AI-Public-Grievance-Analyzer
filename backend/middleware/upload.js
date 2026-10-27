const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storageService = require('../services/storageService');

// Storage engine config with sanitized unique filenames
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = storageService.getUploadsDir();
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanExt = /^\.[a-z0-9]+$/i.test(ext) ? ext : '.bin';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'evidence-' + uniqueSuffix + cleanExt);
  }
});

// File filter (JPG, JPEG, PNG, WEBP, PDF allowed; executables blocked)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /\.(jpe?g|png|webp|pdf)$/i;
  const allowedMimeTypes = /^(image\/(jpeg|png|webp)|application\/pdf)$/i;

  const extValid = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedMimeTypes.test(file.mimetype);

  if (extValid && mimeValid) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG, WEBP, and PDF documents are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

module.exports = upload;
