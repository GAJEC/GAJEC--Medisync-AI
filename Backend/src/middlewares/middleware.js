import { IsSessionActive } from '../util/session.js';

// Verifies the JWT and that its session (sid) has not been signed out or expired.
async function verify(request, reply) {
    try {
        await request.jwtVerify();
    } catch (error) {
        reply.code(401).send({ error: 'Unauthorized' });
        return false;
    }
    try {
        if (!(await IsSessionActive(request.user.sid, request.user.id))) {
            reply.code(401).send({ error: 'Session expired. Please sign in again.' });
            return false;
        }
    } catch (error) {
        request.log.error(error, 'Session check failed');
        reply.code(500).send({ error: 'Internal server error' });
        return false;
    }
    return true;
}

// Requires a valid JWT. On success, the token payload ({ id, email, role, sid }) is on request.user.
//   fastify.get('/me', { preHandler: authenticate }, handler)
export async function authenticate(request, reply) {
    await verify(request, reply);
}

// Requires a valid JWT AND one of the given roles.
//   fastify.get('/patients', { preHandler: authorize('staff') }, handler)
//   fastify.addHook('preHandler', authorize('staff'))   // whole plugin
export function authorize(...roles) {
    return async function (request, reply) {
        if (!(await verify(request, reply))) return;
        if (!roles.includes(request.user.role)) {
            return reply.code(403).send({ error: 'Forbidden' });
        }
    };
}
