import 'server-only'

import { isFeatureEnabled } from '@lib/featureToggles'
import docsManifest from '../../public/dl-index/docs-manifest.json'
import fallbackDocsIndex from '../../public/_build/docs_index.json'

const DEFAULT_DOCS_BASE_URL = 'https://dl.svc.plus/docs'

const normalizeBaseUrl = (value?: string) => {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.replace(/\/$/, '')
}

const docsBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_DOCS_BASE_URL) || DEFAULT_DOCS_BASE_URL

const buildAbsoluteDocUrl = (value?: string) => {
  if (!value || typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  if (!docsBaseUrl) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  }

  try {
    const base = new URL(docsBaseUrl.endsWith('/') ? docsBaseUrl : `${docsBaseUrl}/`)
    const basePath = base.pathname.replace(/\/+$/, '')
    const basePathWithoutLeadingSlash = basePath.replace(/^\/+/, '')

    let relative = trimmed.replace(/^\/+/, '')

    if (
      basePathWithoutLeadingSlash &&
      relative.toLowerCase().startsWith(`${basePathWithoutLeadingSlash.toLowerCase()}/`)
    ) {
      relative = relative.slice(basePathWithoutLeadingSlash.length + 1)
    }

    return new URL(relative || '.', base).toString()
  } catch {
    const ensureLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    return `${docsBaseUrl.replace(/\/+$/, '')}${ensureLeadingSlash}`
  }
}

export interface DocResource {
  slug: string
  title: string
  description: string
  category?: string
  version?: string
  updatedAt?: string
  pdfUrl?: string
  htmlUrl?: string
  tags?: string[]
  estimatedMinutes?: number
  coverImage?: string
  language?: string
  variant?: string
  versionSlug?: string
  pathSegments?: string[]
  collection?: string
  collectionSlug?: string
  collectionLabel?: string
}

interface RawDocResource {
  slug?: unknown
  title?: unknown
  description?: unknown
  category?: unknown
  version?: unknown
  updatedAt?: unknown
  pdfUrl?: unknown
  htmlUrl?: unknown
  tags?: unknown
  estimatedMinutes?: unknown
  coverImage?: unknown
  language?: unknown
  variant?: unknown
  versionSlug?: unknown
  pathSegments?: unknown
  collection?: unknown
  collectionSlug?: unknown
  collectionLabel?: unknown
}

const manifestDocs = Array.isArray(docsManifest) ? (docsManifest as RawDocResource[]) : []
const fallbackDocs = Array.isArray(fallbackDocsIndex) ? (fallbackDocsIndex as RawDocResource[]) : []

const RAW_DOCS = manifestDocs.length > 0 ? manifestDocs : fallbackDocs

export const DOCS_DATASET = RAW_DOCS.map((item) => normalizeResource(item as RawDocResource)).filter(
  (item): item is DocResource => item !== null,
)

export interface DocVersionOption {
  id: string
  label: string
  resource: DocResource
  slug: string
  pathSegment?: string
}

export interface DocCollection {
  slug: string
  title: string
  description: string
  category?: string
  updatedAt?: string
  estimatedMinutes?: number
  tags: string[]
  latestVersionLabel?: string
  latestVariant?: string
  versions: DocVersionOption[]
  defaultVersionId?: string
  defaultVersionSlug?: string
  directory?: string
}

function slugifySegment(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || value.toLowerCase().replace(/\s+/g, '-') || 'doc'
}

function humanizeSegment(value: string): string {
  if (!value) return ''
  const withSpaces = value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  const normalized = withSpaces.replace(/\s+/g, ' ').trim()
  if (!normalized) return value
  return normalized
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function parseUpdatedAt(value?: string): number {
  if (!value) return 0
  const ts = Date.parse(value)
  return Number.isNaN(ts) ? 0 : ts
}

interface CollectionAccumulator {
  directory: string
  slug: string
  label: string
  docs: DocResource[]
}

function buildCollections(docs: DocResource[]): DocCollection[] {
  const map = new Map<string, CollectionAccumulator>()
  const usedSlugs = new Set<string>()

  const ensureUniqueSlug = (slug: string) => {
    let candidate = slug || 'doc'
    if (!usedSlugs.has(candidate)) {
      usedSlugs.add(candidate)
      return candidate
    }
    let counter = 2
    while (usedSlugs.has(`${candidate}-${counter}`)) {
      counter += 1
    }
    const unique = `${candidate}-${counter}`
    usedSlugs.add(unique)
    return unique
  }

  for (const doc of docs) {
    const directory = doc.collection ?? doc.pathSegments?.[0] ?? doc.category ?? doc.slug
    if (!directory) {
      continue
    }
    if (directory === 'all.json' || directory === 'dir.json') {
      continue
    }

    const slug = doc.collectionSlug ?? slugifySegment(directory)
    const label = doc.collectionLabel ?? doc.category ?? humanizeSegment(directory)
    const key = directory
    const existing = map.get(key)
    if (existing) {
      existing.docs.push(doc)
      continue
    }

    map.set(key, {
      directory,
      slug: ensureUniqueSlug(slug),
      label,
      docs: [doc],
    })
  }

  const collections: DocCollection[] = []
  for (const accumulator of map.values()) {
    const docsSorted = [...accumulator.docs].sort((a, b) => parseUpdatedAt(b.updatedAt) - parseUpdatedAt(a.updatedAt))
    const primary = docsSorted[0]
    if (!primary) {
      continue
    }

    const tagSet = new Set<string>()
    for (const doc of docsSorted) {
      if (!doc.tags) continue
      for (const tag of doc.tags) {
        if (tag) tagSet.add(tag)
      }
    }

    const versionSlugSet = new Set<string>()
    const ensureUniqueVersionSlug = (slug: string) => {
      let candidate = slug || 'version'
      if (!versionSlugSet.has(candidate)) {
        versionSlugSet.add(candidate)
        return candidate
      }
      let counter = 2
      while (versionSlugSet.has(`${candidate}-${counter}`)) {
        counter += 1
      }
      const unique = `${candidate}-${counter}`
      versionSlugSet.add(unique)
      return unique
    }

    const versions: DocVersionOption[] = docsSorted.map((doc) => {
      const labelParts: string[] = []
      if (doc.version) {
        labelParts.push(doc.version)
      }
      if (!doc.version && doc.variant) {
        labelParts.push(doc.variant)
      }
      if (doc.language && !labelParts.includes(doc.language)) {
        labelParts.push(doc.language)
      }
      const label = labelParts.length > 0 ? labelParts.join(' • ') : doc.title
      let versionSlug = doc.versionSlug
      if (!versionSlug || !versionSlug.trim()) {
        const candidate = doc.variant ?? doc.version ?? doc.slug
        versionSlug = slugifySegment(candidate)
      }
      versionSlug = ensureUniqueVersionSlug(versionSlug)
      return {
        id: doc.slug,
        label,
        resource: doc,
        slug: versionSlug,
        pathSegment: doc.pathSegments?.[1],
      }
    })

    const collection: DocCollection = {
      slug: accumulator.slug,
      title: primary.title,
      description: primary.description,
      category: primary.category ?? accumulator.label,
      updatedAt: primary.updatedAt,
      estimatedMinutes: primary.estimatedMinutes,
      tags: Array.from(tagSet).sort((a, b) => a.localeCompare(b)),
      latestVersionLabel: versions[0]?.label,
      latestVariant: primary.variant,
      versions,
      defaultVersionId: versions[0]?.id,
      defaultVersionSlug: versions[0]?.slug,
      directory: accumulator.directory,
    }

    collections.push(collection)
  }

  return collections.sort((a, b) => parseUpdatedAt(b.updatedAt) - parseUpdatedAt(a.updatedAt))
}

export const DOC_COLLECTIONS = buildCollections(DOCS_DATASET)

function normalizeResource(item: RawDocResource): DocResource | null {
  if (!item || typeof item !== 'object') {
    return null
  }

  const slug = typeof item.slug === 'string' ? item.slug : undefined
  const title = typeof item.title === 'string' ? item.title : undefined
  if (!slug || !title) {
    return null
  }

  const resource: DocResource = {
    slug,
    title,
    description: typeof item.description === 'string' ? item.description : '',
  }

  if (typeof item.category === 'string' && item.category.trim()) {
    resource.category = item.category
  }
  if (typeof item.version === 'string' && item.version.trim()) {
    resource.version = item.version
  }
  if (typeof item.updatedAt === 'string' && item.updatedAt.trim()) {
    resource.updatedAt = item.updatedAt
  }
  if (typeof item.pdfUrl === 'string' && item.pdfUrl.trim()) {
    resource.pdfUrl = buildAbsoluteDocUrl(item.pdfUrl) ?? item.pdfUrl
  }
  if (typeof item.htmlUrl === 'string' && item.htmlUrl.trim()) {
    resource.htmlUrl = buildAbsoluteDocUrl(item.htmlUrl) ?? item.htmlUrl
  }
  if (typeof item.language === 'string' && item.language.trim()) {
    resource.language = item.language
  }
  if (typeof item.variant === 'string' && item.variant.trim()) {
    resource.variant = item.variant
  }
  if (typeof item.versionSlug === 'string' && item.versionSlug.trim()) {
    resource.versionSlug = item.versionSlug
  }
  if (typeof item.collection === 'string' && item.collection.trim()) {
    resource.collection = item.collection
  }
  if (typeof item.collectionSlug === 'string' && item.collectionSlug.trim()) {
    resource.collectionSlug = item.collectionSlug
  }
  if (typeof item.collectionLabel === 'string' && item.collectionLabel.trim()) {
    resource.collectionLabel = item.collectionLabel
  }
  if (typeof item.estimatedMinutes === 'number' && !Number.isNaN(item.estimatedMinutes)) {
    resource.estimatedMinutes = item.estimatedMinutes
  }
  if (typeof item.coverImage === 'string' && item.coverImage.trim()) {
    resource.coverImage = item.coverImage
  }
  if (Array.isArray(item.tags)) {
    const tags = item.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    if (tags.length > 0) {
      resource.tags = [...new Set(tags)]
    }
  }
  if (Array.isArray(item.pathSegments)) {
    const segments = item.pathSegments.filter((segment): segment is string => typeof segment === 'string' && segment.trim().length > 0)
    if (segments.length > 0) {
      resource.pathSegments = segments
    }
  }

  if (!resource.description.trim()) {
    const context: string[] = []
    if (resource.category) {
      context.push(resource.category)
    }
    if (resource.version) {
      context.push(`edition ${resource.version}`)
    } else if (resource.variant) {
      context.push(`release ${resource.variant}`)
    }
    const formats: string[] = []
    if (resource.pdfUrl) formats.push('PDF')
    if (resource.htmlUrl) formats.push('HTML')
    if (formats.length > 0) {
      context.push(`available as ${formats.join(' and ')}`)
    }
    const suffix = context.length > 0 ? ` (${context.join(', ')})` : ''
    resource.description = `${resource.title}${suffix}.`
  }

  return resource
}

const isDocsModuleEnabled = () => isFeatureEnabled('appModules', '/docs')

export async function getDocResources(): Promise<DocCollection[]> {
  if (!isDocsModuleEnabled()) {
    return []
  }

  return DOC_COLLECTIONS
}

export async function getDocResource(slug: string): Promise<DocCollection | undefined> {
  if (!isDocsModuleEnabled()) {
    return undefined
  }

  return DOC_COLLECTIONS.find((doc) => doc.slug === slug)
}
