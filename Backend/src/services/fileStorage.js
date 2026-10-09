import { createHash, randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Controlled local storage for uploads. File names are server-generated UUIDs; client
 * file names are never used in paths, which prevents path traversal. Files are written
 * with exclusive-create so an existing file is never overwritten.
 */
export function createFileStorage(rootDir) {
  const root = path.resolve(rootDir)

  function resolveKey(key) {
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp|bin)$/.test(key)) throw new Error('invalid storage key')
    const full = path.resolve(root, key)
    if (path.dirname(full) !== root) throw new Error('invalid storage key')
    return full
  }

  return {
    sha256: (buf) => createHash('sha256').update(buf).digest('hex'),

    async save(buffer, ext) {
      await mkdir(root, { recursive: true })
      const key = `${randomUUID()}.${ext}`
      await writeFile(resolveKey(key), buffer, { flag: 'wx', mode: 0o600 })
      return key
    },

    async remove(key) {
      if (!key) return
      await unlink(resolveKey(key)).catch(() => {})
    },
  }
}

/** Detect image type from magic bytes (the client-declared MIME type is not trusted). */
export function sniffImage(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: 'image/png', ext: 'png' }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP')
    return { mime: 'image/webp', ext: 'webp' }
  return null
}

/** Detect common audio containers from magic bytes. */
export function sniffAudio(buf) {
  if (buf.length < 12) return null
  const a4 = buf.toString('ascii', 0, 4)
  if (a4 === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE') return 'audio/wav'
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'audio/webm'
  if (a4 === 'OggS') return 'audio/ogg'
  if (a4 === 'fLaC') return 'audio/flac'
  if (buf.toString('ascii', 4, 8) === 'ftyp') return 'audio/mp4'
  if (buf.toString('ascii', 0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return 'audio/mpeg'
  return null
}
