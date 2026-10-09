import db from '../util/database.js';
import { verifyPassword, hashPassword, EmailSanitizer } from '../util/checker.js';

// User Authentication Functions
export async function Login(fastify, email, password) {
    email = await EmailSanitizer(email);
    const [rows] = await db.execute('SELECT firstname, lastname, email, password FROM users WHERE email = ?', [email]);

    // Same message for unknown email and wrong password, so attackers can't probe which emails exist
    if (rows.length === 0) { return { success: false, message: 'Invalid email or password' }; }

    const { password: storedHash, ...user } = rows[0];
    if (!(await verifyPassword(password, storedHash))) { return { success: false, message: 'Invalid email or password' }; }

    return { success: true, message: 'Login successful', user };
}

export async function Register(fastify, firstname, lastname, email, password) {
    email = await EmailSanitizer(email);
    const hashedPassword = await hashPassword(password);
    await db.execute('INSERT INTO users (firstname, lastname, email, password) VALUES (?, ?, ?, ?)', [firstname, lastname, email, hashedPassword]);
    return { success: true, message: 'User registered successfully' };
}
