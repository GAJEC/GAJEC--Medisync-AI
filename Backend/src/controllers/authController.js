import db from '../util/database.js';
import { verifyPassword, hashPassword, EmailSanitizer } from '../util/checker.js';

// User Authentication Functions
export async function Login(email, password) {
    email = EmailSanitizer(email);
    const [rows] = await db.execute('SELECT id, firstname, lastname, email, role, password FROM users WHERE email = ?', [email]);
    if (rows.length === 0) { return { success: false, message: 'Invalid email or password' }; }

    const { password: storedHash, ...user } = rows[0];
    if (!(await verifyPassword(password, storedHash))) { return { success: false, message: 'Invalid email or password' }; }

    return { success: true, message: 'Login successful', user };
}

// New accounts are always patients; staff are promoted in the database
export async function Register(firstname, lastname, email, password) {
    email = EmailSanitizer(email);
    const hashedPassword = await hashPassword(password);
    await db.execute('INSERT INTO users (firstname, lastname, email, password) VALUES (?, ?, ?, ?)', [firstname, lastname, email, hashedPassword]);
    return { success: true, message: 'User registered successfully' };
}

export async function GetUserById(id) {
    const [rows] = await db.execute('SELECT id, firstname, lastname, email, role, created_at FROM users WHERE id = ?', [id]);
    return rows[0] || null;
}
