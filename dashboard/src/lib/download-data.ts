import 'server-only'

import { cache } from 'react'

import fallbackAllListings from '../../public/dl-index/all.json'
import fallbackArtifactsManifest from '../../public/dl-index/artifacts-manifest.json'
import { runtimeConfig } from '../config'
import type { DirListing } from '@types/download'

const DEFAULT_DOWNLOAD_MANIFEST_URL = 'https://dl.svc.plus/manifest.json'

type DirListingInput = {
  path?: unknown
  entries?: unknown
}

function isDirListing(value: DirListingInput): value is DirListing {
  if (!value || typeof value !== 'object') {
    return false
  }
  if (typeof value.path !== 'string') {
    return false
  }
  if (!Array.isArray(value.entries)) {
    return false
  }
  return true
}

function parseDirListings(value: unknown): DirListing[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is DirListing => isDirListing(item as DirListingInput))
}

const FALLBACK_LISTINGS: DirListing[][] = [
  parseDirListings(fallbackArtifactsManifest),
  parseDirListings(fallbackAllListings),
]

function resolveDownloadManifestUrl(): string {
  const candidates: Array<string | undefined> = []

  const configUrl = runtimeConfig.downloadManifestUrl
  if (typeof configUrl === 'string') {
    candidates.push(configUrl)
  }

  candidates.push(process.env.DOWNLOAD_MANIFEST_URL)
  candidates.push(process.env.NEXT_PUBLIC_DOWNLOAD_MANIFEST_URL)

  for (const candidate of candidates) {
    const trimmed = candidate?.trim()
    if (trimmed) {
      return trimmed
    }
  }

  return DEFAULT_DOWNLOAD_MANIFEST_URL
}

async function fetchDirListings(url: string): Promise<DirListing[]> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch download manifest (${response.status} ${response.statusText})`)
  }

  const payload = (await response.json()) as unknown
  const listings = parseDirListings(payload)
  if (listings.length === 0) {
    throw new Error('Download manifest response did not contain any listings')
  }

  return listings
}

function getFallbackListings(): DirListing[] {
  for (const snapshot of FALLBACK_LISTINGS) {
    if (snapshot.length > 0) {
      return snapshot
    }
  }
  return []
}

export const getDownloadListings = cache(async (): Promise<DirListing[]> => {
  const url = resolveDownloadManifestUrl()

  try {
    return await fetchDirListings(url)
  } catch (error) {
    console.warn(`[download-data] Failed to fetch download manifest from "${url}"`, error)
  }

  const fallback = getFallbackListings()
  if (fallback.length > 0) {
    return fallback
  }

  return []
})

export interface DownloadSection {
  key: string
  title: string
  href: string
  lastModified?: string
  count?: number
  root: string
}

function normalizeSegment(segment: string): string {
  return segment.replace(/\\/g, '/').trim().replace(/\/+$/g, '')
}

function normalizeSegments(segments: string[]): string[] {
  return segments
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => normalizeSegment(segment))
}

function toListingKey(segments: string[]): string {
  const normalized = normalizeSegments(segments).join('/')
  return normalized ? `${normalized}/` : ''
}

function normalizeListingPath(path: string): string {
  if (!path) {
    return ''
  }
  const cleaned = path.replace(/\\/g, '/').trim()
  return cleaned.endsWith('/') ? cleaned : `${cleaned}/`
}

export function formatSegmentLabel(segment: string): string {
  const cleaned = normalizeSegment(segment)
  return (
    cleaned
      .split(/[-_]/g)
      .filter(Boolean)
      .map((part) => (part.match(/^[a-z]+$/) ? part.charAt(0).toUpperCase() + part.slice(1) : part))
      .join(' ') || cleaned
  )
}

export function findListing(allListings: DirListing[], segments: string[]): DirListing | undefined {
  const key = toListingKey(segments)
  return allListings.find((listing) => normalizeListingPath(listing.path) === key)
}

export function countFiles(listing: DirListing, allListings: DirListing[]): number {
  const baseSegments = listing.path.split('/').filter(Boolean)
  return listing.entries.reduce((total, entry) => {
    if (entry.type === 'file') {
      return total + 1
    }
    if (entry.type === 'dir') {
      const child = findListing(allListings, [...baseSegments, entry.name])
      if (child) {
        return total + countFiles(child, allListings)
      }
    }
    return total
  }, 0)
}

export function buildSectionsForListing(
  listing: DirListing,
  allListings: DirListing[],
  baseSegments: string[],
): DownloadSection[] {
  return listing.entries
    .filter((entry) => entry.type === 'dir')
    .map((entry) => {
      const entrySegment = normalizeSegment(entry.name)
      const segments = [...baseSegments, entrySegment]
      const childListing = findListing(allListings, segments)
      return {
        key: segments.join('/'),
        title: formatSegmentLabel(entrySegment),
        href: `/download/${segments.join('/')}/`,
        lastModified: entry.lastModified,
        count: childListing ? countFiles(childListing, allListings) : undefined,
        root: baseSegments[0] ?? entrySegment,
      }
    })
}

export function buildDownloadSections(allListings: DirListing[]): Record<string, DownloadSection[]> {
  const rootListing = findListing(allListings, [])
  if (!rootListing) {
    return {}
  }

  const sectionsMap: Record<string, DownloadSection[]> = {}

  for (const entry of rootListing.entries) {
    if (entry.type !== 'dir') continue
    const entrySegment = normalizeSegment(entry.name)
    const rootSegments = [entrySegment]
    const key = rootSegments.join('/')
    const listing = findListing(allListings, rootSegments)
    if (!listing) {
      sectionsMap[entrySegment] = [
        {
          key,
          title: formatSegmentLabel(entrySegment),
          href: `/download/${key}/`,
          lastModified: entry.lastModified,
          root: entrySegment,
        },
      ]
      continue
    }

    const childSections = buildSectionsForListing(listing, allListings, rootSegments)
    const hasFiles = listing.entries.some((item) => item.type === 'file')
    if (childSections.length > 0) {
      sectionsMap[entrySegment] = hasFiles
        ? [
            {
              key,
              title: formatSegmentLabel(entrySegment),
              href: `/download/${key}/`,
              lastModified: entry.lastModified,
              count: countFiles(listing, allListings),
              root: entrySegment,
            },
            ...childSections,
          ]
        : childSections;
    } else {
      sectionsMap[entrySegment] = [
        {
          key,
          title: formatSegmentLabel(entrySegment),
          href: `/download/${key}/`,
          lastModified: entry.lastModified,
          count: countFiles(listing, allListings),
          root: entrySegment,
        },
      ]
    }
  }

  return sectionsMap
}
