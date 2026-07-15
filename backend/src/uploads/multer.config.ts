import { BadRequestException } from '@nestjs/common';
import { diskStorage, type StorageEngine } from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
export const UPLOAD_URL_PREFIX = '/uploads';

// When AWS_S3_BUCKET is set (e.g. on Elastic Beanstalk, whose disk is
// ephemeral) uploads go to S3; otherwise they fall back to local disk
// (single-box EC2 / dev). This keeps the existing deploy working while
// enabling the managed S3 path.
const S3_BUCKET = process.env.AWS_S3_BUCKET;
const S3_REGION = process.env.AWS_REGION ?? 'us-east-1';
export const useS3 = Boolean(S3_BUCKET);

const s3Client = useS3 ? new S3Client({ region: S3_REGION }) : null;

if (!useS3 && !existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

const makeKey = (originalname: string): string =>
  `${randomUUID()}${extname(originalname).toLowerCase()}`;

const storage: StorageEngine = useS3
  ? multerS3({
      s3: s3Client!,
      bucket: S3_BUCKET!,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (_req, file, cb) => cb(null, makeKey(file.originalname)),
    })
  : diskStorage({
      destination: UPLOAD_DIR,
      filename: (_req, file, cb) => cb(null, makeKey(file.originalname)),
    });

// Shared multer options for image uploads (logo, product images).
export const imageMulterOptions = {
  storage,
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

// Disk uploads are served under /uploads by the app.
export const fileToUrl = (filename: string): string => `${UPLOAD_URL_PREFIX}/${filename}`;

// Resolve a stored file's public URL for whichever backend handled it.
// multer-s3 sets `location` (full S3 URL); disk storage sets `filename`.
export const uploadedFileUrl = (file: Express.Multer.File): string => {
  const s3File = file as Express.Multer.File & { location?: string; key?: string };
  if (useS3) {
    return s3File.location ?? `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${s3File.key}`;
  }
  return fileToUrl(file.filename);
};
