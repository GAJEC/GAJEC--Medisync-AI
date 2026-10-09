// Requires a valid JWT. On success, the token payload ({ id, email, role }) is on request.user.
//   fastify.get('/me', { preHandler: authenticate }, handler)
export async function authenticate(request, reply) {
    try {
        await request.jwtVerify();
    } catch (error) {
        return reply.code(401).send({ error: 'Unauthorized' });
    }
}

// Requires a valid JWT AND one of the given roles.
//   fastify.get('/patients', { preHandler: authorize('staff') }, handler)
//   fastify.addHook('preHandler', authorize('staff'))   // whole plugin
export function authorize(...roles) {
    return async function (request, reply) {
        try {
            await request.jwtVerify();
        } catch (error) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }
        if (!roles.includes(request.user.role)) {
            return reply.code(403).send({ error: 'Forbidden' });
        }
    };
}
