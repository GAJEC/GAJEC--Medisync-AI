import dotenv from 'dotenv';
dotenv.config();

export const MODE = process.env.STAGE || 'development';
export const PORT = process.env.PORT;

export const API_CONFIG = {
    key: process.env.API_KEY,
};

export const DB_CONFIG = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
};

export const JWT_CONFIG = {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
};

if (!JWT_CONFIG.secret || JWT_CONFIG.secret.length < 32) {
    throw new Error('JWT_SECRET must be set in .env and be at least 32 characters long');
}

// Comma-separated list of allowed frontend origins, e.g. "http://localhost:5173,https://medisync.app"
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const AI_CONFIG = {
    serviceUrl: (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001').replace(/\/+$/, ''),
    internalToken: process.env.AI_INTERNAL_TOKEN || '',
};
