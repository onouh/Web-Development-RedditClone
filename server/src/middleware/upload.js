import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/http.js';

fs.mkdirSync(env.uploadsDir, { recursive: true });

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 5) || '.img';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new ApiError(400, 'Only PNG, JPEG, WebP or GIF images are allowed'));
    }
    cb(null, true);
  },
}).single('file');

export const handleUpload = (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image uploaded');
  res.status(201).json({ url: `/uploads/${req.file.filename}`, size: req.file.size });
};
