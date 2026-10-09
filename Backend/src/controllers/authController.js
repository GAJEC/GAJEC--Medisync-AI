import db from '../util/database.js';
import { verifyPassword, hashPassword, EmailSanitizer } from '../util/checker.js';

// User Authentication Functions
export async function Login(email, password) {
    email = EmailSanitizer(email);
    const [rows] = await db.execute('SELECT id, firstname, lastname, email, role, theme, password FROM users WHERE email = ?', [email]);
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
    const [rows] = await db.execute(
        'SELECT id, firstname, lastname, email, role, theme, created_at, password_changed_at FROM users WHERE id = ?',
        [id],
    );
    return rows[0] || null;
}

// Light / dark appearance for the signed-in account.
export async function UpdateTheme(userId, theme) {
    const [result] = await db.execute('UPDATE users SET theme = ? WHERE id = ?', [theme, userId]);
    return result.affectedRows > 0;
}

export async function ChangePassword(userId, currentPassword, newPassword) {
    const [rows] = await db.execute('SELECT password FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) { return { success: false, status: 404, message: 'User not found' }; }
    if (!(await verifyPassword(currentPassword, rows[0].password))) {
        return { success: false, status: 400, message: 'Your current password is incorrect.' };
    }
    if (await verifyPassword(newPassword, rows[0].password)) {
        return { success: false, status: 400, message: 'Choose a password you have not used before.' };
    }

    const hashedPassword = await hashPassword(newPassword);
    await db.execute('UPDATE users SET password = ?, password_changed_at = NOW() WHERE id = ?', [hashedPassword, userId]);
    return { success: true, message: 'Password updated' };
}
