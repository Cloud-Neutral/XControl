import { useSyncExternalStore } from 'react'

import { registerBuiltinExtensions } from './builtin'
import type {
  ExtensionDescriptor,
  ExtensionRegistration,
  ExtensionRegistry,
  ExtensionRegistryBuilder,
  ExtensionRegistrySnapshot,
  ExtensionRuntime,
  RegisteredExtension,
  RegisteredMenuItem,
  RegisteredRoute,
} from './types'

function normalizeOrder(value: number | undefined, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback
}

function isPathMatch(candidate: string, pathname: string) {
  if (candidate === pathname) {
    return true
  }
  if (!candidate.endsWith('/')) {
    return pathname.startsWith(`${candidate}/`)
  }
  return pathname.startsWith(candidate)
}

class ExtensionRuntime implements ExtensionRegistry, ExtensionRegistryBuilder {
  private readonly extensions = new Map<string, RegisteredExtension>()
  private readonly routes = new Map<string, RegisteredRoute>()
  private readonly menu = new Map<string, RegisteredMenuItem>()
  private readonly listeners = new Set<() => void>()
  private version = 0

  registerExtension(registration: ExtensionRegistration): void {
    if (this.extensions.has(registration.id)) {
      throw new Error(`Extension "${registration.id}" already registered`)
    }

    const baseMeta = registration.meta
    const extension: RegisteredExtension = {
      ...registration,
      meta: {
        ...baseMeta,
        order: normalizeOrder(baseMeta.order),
      },
      enabled: true,
    }

    this.extensions.set(extension.id, extension)

    for (const route of registration.routes) {
      if (this.routes.has(route.id)) {
        throw new Error(`Route "${route.id}" already registered`)
      }
      const normalized: RegisteredRoute = {
        ...route,
        order: normalizeOrder(route.order),
        extensionId: extension.id,
        extension,
      }
      this.routes.set(normalized.id, normalized)
    }

    if (registration.menu) {
      for (const item of registration.menu) {
        if (this.menu.has(item.id)) {
          throw new Error(`Menu item "${item.id}" already registered`)
        }
        const normalized: RegisteredMenuItem = {
          ...item,
          extensionId: extension.id,
          extension,
          route: this.routes.get(item.routeId),
        }
        this.menu.set(normalized.id, normalized)
      }
    }

    this.notify()
  }

  listExtensions(): RegisteredExtension[] {
    return Array.from(this.extensions.values()).sort((a, b) => {
      const orderDiff = normalizeOrder(a.meta.order) - normalizeOrder(b.meta.order)
      if (orderDiff !== 0) {
        return orderDiff
      }
      return a.meta.displayName.localeCompare(b.meta.displayName)
    })
  }

  listRoutes(): RegisteredRoute[] {
    return Array.from(this.routes.values()).sort((a, b) => {
      const extOrderDiff = normalizeOrder(a.extension.meta.order) - normalizeOrder(b.extension.meta.order)
      if (extOrderDiff !== 0) {
        return extOrderDiff
      }
      const routeOrderDiff = normalizeOrder(a.order) - normalizeOrder(b.order)
      if (routeOrderDiff !== 0) {
        return routeOrderDiff
      }
      return a.path.localeCompare(b.path)
    })
  }

  listMenuItems(): RegisteredMenuItem[] {
    return Array.from(this.menu.values())
      .filter((item) => !item.hidden)
      .sort((a, b) => {
        const extOrderDiff = normalizeOrder(a.extension.meta.order) - normalizeOrder(b.extension.meta.order)
        if (extOrderDiff !== 0) {
          return extOrderDiff
        }
        const sectionDiff = a.section.localeCompare(b.section)
        if (sectionDiff !== 0) {
          return sectionDiff
        }
        const orderDiff = normalizeOrder(a.order) - normalizeOrder(b.order)
        if (orderDiff !== 0) {
          return orderDiff
        }
        return a.label.localeCompare(b.label)
      })
  }

  findRouteByPath(pathname: string): RegisteredRoute | undefined {
    const candidates = this.listRoutes().sort((a, b) => b.path.length - a.path.length)
    return candidates.find((route) => isPathMatch(route.path, pathname))
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getVersion(): number {
    return this.version
  }

  private notify() {
    this.version += 1
    for (const listener of this.listeners) {
      listener()
    }
  }
}

const defaultRuntime = new ExtensionRuntime()
registerBuiltinExtensions(defaultRuntime)

const snapshot = (): ExtensionRegistrySnapshot => ({
  version: defaultRuntime.getVersion(),
  registry: defaultRuntime,
})

export function useExtensionRegistry(): ExtensionRegistry {
  const state = useSyncExternalStore(defaultRuntime.subscribe.bind(defaultRuntime), snapshot, snapshot)
  return state.registry
}

export function getExtensionRegistry(): ExtensionRegistry {
  return defaultRuntime
}

export function createExtensionRuntime(options: { includeBuiltins?: boolean } = {}): ExtensionRuntime {
  const runtime = new ExtensionRuntime()
  if (options.includeBuiltins ?? true) {
    registerBuiltinExtensions(runtime)
  }
  return runtime
}

export async function loadExtension(
  descriptor: ExtensionDescriptor,
  options: { runtime?: ExtensionRuntime } = {},
): Promise<void> {
  if (descriptor.enabled === false) {
    return
  }

  const module = await descriptor.load()
  const builder: ExtensionRegistryBuilder = {
    registerExtension(registration: ExtensionRegistration) {
      const target = options.runtime ?? defaultRuntime
      target.registerExtension({
        ...registration,
        source: registration.source ?? descriptor.source ?? 'dynamic',
      })
    },
  }
  await module.register(builder)
}

export async function loadExtensions(
  descriptors: ExtensionDescriptor[],
  options: { runtime?: ExtensionRuntime } = {},
): Promise<void> {
  for (const descriptor of descriptors) {
    // eslint-disable-next-line no-await-in-loop
    await loadExtension(descriptor, options)
  }
}
