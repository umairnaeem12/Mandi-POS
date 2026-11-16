import { BadRequestException } from '@nestjs/common';
import { diskStorage, type StorageEngine } from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
export const UPLOAD_URL_PREFIX = '/uploads';

// With a bucket configured, uploads go to S3 or any S3-compatible store (Supabase
// Storage via S3_ENDPOINT); otherwise local disk, which only suits a single
// long-running box. Vercel's disk is read-only, so it needs the bucket.
// S3_* names come first because Vercel reserves the AWS_* env vars.
const S3_BUCKET = process.env.S3_BUCKET ?? process.env.AWS_S3_BUCKET;
const S3_REGION = process.env.S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
const S3_ENDPOINT = process.env.S3_ENDPOINT?.replace(/\/+$/, '');
export const useS3 = Boolean(S3_BUCKET);

// Supabase serves public objects from a different path than its S3 endpoint.
const S3_PUBLIC_URL = (
  process.env.S3_PUBLIC_URL ??
  (S3_ENDPOINT?.endsWith('/storage/v1/s3')
    ? `${S3_ENDPOINT.replace(/\/storage\/v1\/s3$/, '/storage/v1/object/public')}/${S3_BUCKET}`
    : undefined)
)?.replace(/\/+$/, '');

const s3Client = useS3
  ? new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT,
      forcePathStyle: Boolean(S3_ENDPOINT),
      credentials:
        process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    })
  : null;

if (!useS3 && !existsSync(UPLOAD_DIR)) {
  try {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.warn(`Upload dir ${UPLOAD_DIR} unavailable (${(err as Error).message}); set S3_BUCKET.`);
  }
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
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB: Vercel rejects request bodies over 4.5 MB
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
    if (S3_PUBLIC_URL) return `${S3_PUBLIC_URL}/${s3File.key}`;
    return s3File.location ?? `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${s3File.key}`;
  }
  return fileToUrl(file.filename);
};
