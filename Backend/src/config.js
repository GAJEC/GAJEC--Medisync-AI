import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

export const MODE = process.env.STAGE || 'development';
export const PORT = process.env.PORT;