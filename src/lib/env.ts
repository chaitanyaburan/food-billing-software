import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(28800), // 8 hours instead of 15 minutes
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(1209600),
  APP_BASE_URL: z.string().url(),
  INVOICE_STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  LOCAL_INVOICE_DIR: z.string().default("./storage/invoices"),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional()
});

export const env = envSchema.parse(process.env);
