import fp from 'fastify-plugin'
import mysql from 'mysql2/promise'

/**
 * Registers `fastify.db` (a mysql2 promise pool) and `fastify.withTransaction(fn)`.
 * All queries must use placeholders (`?`), never string concatenation.
 * Tests may pass `opts.pool` to inject a fake.
 */
export default fp(
  async function database(fastify, opts) {
    const pool =
      opts.pool ??
      mysql.createPool({
        host: opts.host,
        port: opts.port,
        user: opts.user,
        password: opts.password,
        database: opts.database,
        connectionLimit: opts.connectionLimit,
        waitForConnections: true,
        queueLimit: 50,
        timezone: 'Z',
        dateStrings: false,
        supportBigNumbers: true,
        bigNumberStrings: false,
        connectTimeout: 5_000,
      })

    fastify.decorate('db', pool)

    fastify.decorate('withTransaction', async (fn) => {
      const conn = await pool.getConnection()
      try {
        await conn.beginTransaction()
        const result = await fn(conn)
        await conn.commit()
        return result
      } catch (err) {
        await conn.rollback().catch(() => {})
        throw err
      } finally {
        conn.release()
      }
    })

    fastify.decorate('dbHealthy', async () => {
      try {
        await pool.query('SELECT 1')
        return true
      } catch (err) {
        fastify.log.warn({ code: err.code }, 'database health check failed')
        return false
      }
    })

    fastify.addHook('onClose', async () => {
      await pool.end()
    })
  },
  { name: 'database' },
)
