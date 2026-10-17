// src/modules/providers/utils/logo-upload.ts
import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';
import { randomBytes } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';

export const LOGO_DIR = 'uploads/providers';
export const LOGO_URL_PREFIX = '/uploads/providers';

const ALLOWED = ['image/jpeg', 'image/png'];

// JPEG / PNG only, max 2MB
export const logoUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      mkdirSync(LOGO_DIR, { recursive: true });
      cb(null, LOGO_DIR);
    },
    filename: (_req, file, cb) => {
      cb(
        null,
        randomBytes(16).toString('hex') +
          extname(file.originalname).toLowerCase(),
      );
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(
        new BadRequestException('Logo must be a JPEG or PNG image'),
        false,
      );
    }
    cb(null, true);
  },
};
