import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
export const UPLOAD_URL_PREFIX = '/uploads';

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

// Shared multer options for image uploads (logo, product images).
export const imageMulterOptions = {
  storage: diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (
    _req: unknown,
    file: { originalname: string },
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED.includes(ext)) {
      return cb(new BadRequestException(`Unsupported file type: ${ext}`), false);
    }
    cb(null, true);
  },
};

export const fileToUrl = (filename: string): string => `${UPLOAD_URL_PREFIX}/${filename}`;
