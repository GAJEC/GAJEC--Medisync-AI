import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
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

