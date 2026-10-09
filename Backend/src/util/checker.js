import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import db from './database.js';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

// Password Related Functions
export async function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const hash = await scryptAsync(password, salt, KEY_LENGTH);
    return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
    if (typeof stored !== 'string' || !stored.includes(':')) return false;
    const [salt, hashHex] = stored.split(':');
    const storedHash = Buffer.from(hashHex, 'hex');
    if (storedHash.length !== KEY_LENGTH) return false;
    const hash = await scryptAsync(password, salt, KEY_LENGTH);
    return timingSafeEqual(hash, storedHash);
}

// Email Related Functions
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof email === 'string' && emailRegex.test(email);
}

export function EmailSanitizer(email) {
    return String(email).toLowerCase().trim();
}

export async function isEmailRegistered(email) {
    email = EmailSanitizer(email);
    try {
        const [rows] = await db.execute('SELECT 1 FROM users WHERE email = ? LIMIT 1', [email]);
        return rows.length > 0;
    } catch (error) {
        console.error('Error checking email registration:', error);
        throw error;
    }
}