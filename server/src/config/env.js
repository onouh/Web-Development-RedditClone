import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Load server/.env first, then a root-level .env if present (without overriding).
dotenv.config({ path: path.resolve(here, '../../.env') });
dotenv.config({ path: path.resolve(here, '../.env') });

const bool = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const list = (value, fallback = []) =>
  (value ? String(value).split(',') : fallback).map((item) => item.trim()).filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  isTest: process.env.NODE_ENV === 'test',
  // 5050 by default: macOS AirPlay Receiver commonly occupies 5000.
  port: Number(process.env.PORT) || 5050,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/reddit_clone?replicaSet=rs0',
  jwtSecret: process.env.JWT_SECRET || 'dev-access-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
  clientUrl,
  corsOrigins: list(process.env.CORS_ORIGINS, [
    clientUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]),
  crossSiteCookies: bool(process.env.CROSS_SITE_COOKIES, false),
  ai: {
    provider: (process.env.AI_PROVIDER || 'gemini').toLowerCase(),
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL_NAME || 'gemini-2.0-flash',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  },
  uploadsDir: path.resolve(here, '../uploads'),
  seedPassword: process.env.SEED_PASSWORD || 'Password123!',
};

export const publicUserFields =
  'username displayName bio avatarUrl bannerUrl postKarma commentKarma createdAt';
