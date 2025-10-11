import 'server-only'

import type { DirListing } from '../types/download'

type DenoFs = { readTextFileSync(path: string | URL): string }

type DenoLike = { readTextFileSync?: (path: string | URL) => string }

function readTextFile(url: URL): string | undefined {
  const deno = (globalThis as { Deno?: DenoFs }).Deno
  const reader: DenoLike | undefined = deno
  if (!reader?.readTextFileSync) {
    return undefined
  }
  try {
    return reader.readTextFileSync(url)
  } catch {
    return undefined
  }
}

function readListings(relativePath: string): DirListing[] {
  try {
    const fileUrl = new URL(`../${relativePath}`, import.meta.url)
    const content = readTextFile(fileUrl)
    if (!content) return []
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? (parsed as DirListing[]) : []
  } catch {
    return []
  }
}

const manifestListings = readListings('public/dl-index/artifacts-manifest.json')
const fallbackListings = readListings('public/dl-index/all.json')

export const DOWNLOAD_LISTINGS: DirListing[] =
  manifestListings.length > 0 ? manifestListings : fallbackListings

export function getDownloadListings(): DirListing[] {
  return DOWNLOAD_LISTINGS
}
