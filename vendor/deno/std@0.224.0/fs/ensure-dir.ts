import { fileURLToPath } from 'node:url'

function toPathString(path: string | URL): string {
  if (typeof path === 'string') {
    return path
  }
  if (path instanceof URL) {
    return fileURLToPath(path)
  }
  throw new TypeError('Path must be a string or file URL')
}

export async function ensureDir(path: string | URL): Promise<void> {
  const dirPath = toPathString(path)
  await Deno.mkdir(dirPath, { recursive: true })
}

export function ensureDirSync(path: string | URL): void {
  const dirPath = toPathString(path)
  Deno.mkdirSync(dirPath, { recursive: true })
}
