import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  ACCESS_TOKEN_EXPIRES_IN: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),
  APP_PORT: Joi.number().default(4000),
  APP_URL: Joi.string().uri().default('http://localhost:4000'),
  // Comma-separated list of allowed CORS origins (e.g. localhost + LAN IP for phones/tablets).
  FRONTEND_URL: Joi.string().default('http://localhost:5173'),
  UPLOAD_DIR: Joi.string().default('./uploads'),

  // Supabase Realtime. Without these, real-time events use the Socket.IO gateway.
  SUPABASE_URL: Joi.string().uri().optional(),
  SUPABASE_SECRET_KEY: Joi.string().optional(),
  SUPABASE_JWT_SECRET: Joi.string().optional(),

  // S3-compatible uploads (AWS S3 or Supabase Storage). Without a bucket, local disk.
  S3_BUCKET: Joi.string().optional(),
  S3_REGION: Joi.string().optional(),
  S3_ENDPOINT: Joi.string().uri().optional(),
  S3_ACCESS_KEY_ID: Joi.string().optional(),
  S3_SECRET_ACCESS_KEY: Joi.string().optional(),
  S3_PUBLIC_URL: Joi.string().uri().optional(),
});
