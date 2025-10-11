import { fileURLToPath } from 'node:url'

export function fromFileUrl(url: string | URL): string {
  if (typeof url === 'string') {
    return fileURLToPath(url)
  }
  return fileURLToPath(url)
}
