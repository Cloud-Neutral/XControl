import 'server-only'

import { cache } from 'react'

import fallbackDocsManifest from '../../public/dl-index/docs-manifest.json'
import fallbackDocsIndex from '../../public/_build/docs_index.json'
import { runtimeConfig } from '../config'

const DEFAULT_DOCS_MANIFEST_URL = 'https://dl.svc.plus/docs/all.json'

export type DocsManifestRecord = Record<string, unknown>

function isRecord(value: unknown): value is DocsManifestRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseDocsManifest(value: unknown): DocsManifestRecord[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is DocsManifestRecord => isRecord(item))
}

const FALLBACK_MANIFESTS: DocsManifestRecord[][] = [
  parseDocsManifest(fallbackDocsManifest),
  parseDocsManifest(fallbackDocsIndex),
]

function resolveDocsManifestUrl(): string {
  const candidates: Array<string | undefined> = []

  const configUrl = runtimeConfig.docsManifestUrl
  if (typeof configUrl === 'string') {
    candidates.push(configUrl)
  }

  candidates.push(process.env.DOCS_MANIFEST_URL)
  candidates.push(process.env.NEXT_PUBLIC_DOCS_MANIFEST_URL)

  for (const candidate of candidates) {
    const trimmed = candidate?.trim()
    if (trimmed) {
      return trimmed
    }
  }

  return DEFAULT_DOCS_MANIFEST_URL
}

async function fetchDocsManifest(url: string): Promise<DocsManifestRecord[]> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch docs manifest (${response.status} ${response.statusText})`)
  }

  const payload = (await response.json()) as unknown
  const manifest = parseDocsManifest(payload)
  if (manifest.length === 0) {
    throw new Error('Docs manifest response did not contain any entries')
  }

  return manifest
}

function getFallbackDocsManifest(): DocsManifestRecord[] {
  for (const snapshot of FALLBACK_MANIFESTS) {
    if (snapshot.length > 0) {
      return snapshot
    }
  }
  return []
}

export const getDocsManifest = cache(async (): Promise<DocsManifestRecord[]> => {
  const url = resolveDocsManifestUrl()

  try {
    return await fetchDocsManifest(url)
  } catch (error) {
    console.warn(`[download-manifest] Failed to fetch docs manifest from "${url}"`, error)
  }

  const fallback = getFallbackDocsManifest()
  if (fallback.length > 0) {
    return fallback
  }

  return []
})
