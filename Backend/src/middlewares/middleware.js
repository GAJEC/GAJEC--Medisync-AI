export async function authenticate(request, reply) {
    try {
        await request.jwtVerify();
    } catch (error) {
        return reply.code(401).send({ error: 'Unauthorized' });
    }
}
