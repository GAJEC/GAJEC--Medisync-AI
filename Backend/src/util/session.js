import { randomBytes } from 'crypto';
import db from './database.js';

// Each login gets a row in user_sessions. Its id travels in the JWT as `sid`,
// so a session can be signed out server-side even though the JWT is still valid.

export function NewSessionId() {
    return randomBytes(16).toString('hex');
}

export async function CreateSession(sid, userId, expiresAtSeconds, request) {
    const userAgent = String(request.headers['user-agent'] || '').slice(0, 255) || null;
    await db.execute(
        'INSERT INTO user_sessions (id, user_id, user_agent, ip, expires_at) VALUES (?, ?, ?, ?, FROM_UNIXTIME(?))',
        [sid, userId, userAgent, request.ip || null, expiresAtSeconds],
    );
}

export async function IsSessionActive(sid, userId) {
    if (typeof sid !== 'string' || !userId) return false;
    const [rows] = await db.execute(
        `SELECT last_seen_at < NOW() - INTERVAL 1 MINUTE AS stale
           FROM user_sessions
          WHERE id = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > NOW()`,
        [sid, userId],
    );
    if (rows.length === 0) return false;
    if (rows[0].stale) {
        await db.execute('UPDATE user_sessions SET last_seen_at = NOW() WHERE id = ?', [sid]);
    }
    return true;
}

export async function RevokeSession(sid, userId) {
    await db.execute(
        'UPDATE user_sessions SET revoked_at = NOW() WHERE id = ? AND user_id = ? AND revoked_at IS NULL',
        [sid, userId],
    );
}

export async function RevokeOtherSessions(currentSid, userId) {
    const [result] = await db.execute(
        'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ? AND id <> ? AND revoked_at IS NULL',
        [userId, currentSid],
    );
    return result.affectedRows;
}

export async function ListActiveSessions(currentSid, userId) {
    const [rows] = await db.execute(
        `SELECT id, user_agent, ip, created_at, last_seen_at
           FROM user_sessions
          WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()
          ORDER BY last_seen_at DESC`,
        [userId],
    );
    // The raw session id is a credential component; only expose whether it is the caller's.
    return rows.map((row, index) => ({
        key: index + 1,
        current: row.id === currentSid,
        device: describeUserAgent(row.user_agent),
        ip: row.ip,
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at,
    }));
}

function describeUserAgent(ua) {
    if (!ua) return 'Unknown device';
    const browser =
        /Edg\//.test(ua) ? 'Edge'
            : /OPR\//.test(ua) ? 'Opera'
                : /Chrome\//.test(ua) ? 'Chrome'
                    : /Firefox\//.test(ua) ? 'Firefox'
                        : /Safari\//.test(ua) ? 'Safari'
                            : 'Browser';
    const os =
        /Windows/.test(ua) ? 'Windows'
            : /Android/.test(ua) ? 'Android'
                : /iPhone|iPad/.test(ua) ? 'iOS'
                    : /Mac OS X/.test(ua) ? 'macOS'
                        : /Linux/.test(ua) ? 'Linux'
                            : 'unknown OS';
    return `${browser} on ${os}`;
}
