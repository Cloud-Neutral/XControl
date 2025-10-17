import type { AccessRule } from '@lib/accessControl'

import { getExtensionRegistry } from '../extensions/loader'
import type { ExtensionLayout } from '../extensions/types'

export interface ModuleEntrySummary {
  extensionId: string
  routeId: string
  path: string
  layout: ExtensionLayout
  componentName: string
  guard?: AccessRule
  stores: string[]
}

function resolveComponentName(component: unknown): string {
  if (typeof component === 'function') {
    return component.displayName ?? component.name ?? 'AnonymousComponent'
  }
  return 'AnonymousComponent'
}

export function listAppModules(): ModuleEntrySummary[] {
  const registry = getExtensionRegistry()
  return registry.listRoutes().map((route) => ({
    extensionId: route.extensionId,
    routeId: route.id,
    path: route.path,
    layout: route.layout,
    componentName: resolveComponentName(route.component),
    guard: route.guard,
    stores: route.extension.stores?.map((store) => store.id) ?? [],
  }))
}
