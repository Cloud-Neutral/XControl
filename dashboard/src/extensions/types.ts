import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'

import type { AccessRule } from '@lib/accessControl'

export type ExtensionLayout = 'panel' | 'public' | 'auth'

export interface ExtensionMeta {
  displayName: string
  description?: string
  version?: string
  keywords?: string[]
  homepage?: string
  author?: string
  icon?: LucideIcon
  category?: string
  order?: number
  tags?: string[]
}

export interface ExtensionRouteRedirect {
  unauthenticated?: string
  forbidden?: string
}

export interface ExtensionRoute {
  id: string
  path: string
  layout: ExtensionLayout
  component: ComponentType
  guard?: AccessRule
  redirect?: ExtensionRouteRedirect
  order?: number
}

export interface ExtensionMenuItem {
  id: string
  routeId: string
  label: string
  description?: string
  section: string
  order?: number
  icon?: LucideIcon
  hidden?: boolean
  disabled?: boolean
  allowWhenMfaPending?: boolean
}

export type ExtensionStoreScope = 'client' | 'server' | 'shared'

export interface ExtensionStore {
  id: string
  scope: ExtensionStoreScope
  initialize: () => unknown
  description?: string
}

export interface ExtensionRegistration {
  id: string
  meta: ExtensionMeta
  routes: ExtensionRoute[]
  menu?: ExtensionMenuItem[]
  stores?: ExtensionStore[]
  source?: string
}

export interface RegisteredRoute extends ExtensionRoute {
  extensionId: string
  extension: RegisteredExtension
}

export interface RegisteredMenuItem extends ExtensionMenuItem {
  extensionId: string
  extension: RegisteredExtension
  route?: RegisteredRoute
}

export interface RegisteredExtension extends ExtensionRegistration {
  enabled: boolean
}

export interface ExtensionRegistrySnapshot {
  version: number
  registry: ExtensionRegistry
}

export interface ExtensionRegistry {
  listExtensions(): RegisteredExtension[]
  listRoutes(): RegisteredRoute[]
  listMenuItems(): RegisteredMenuItem[]
  findRouteByPath(pathname: string): RegisteredRoute | undefined
  subscribe(listener: () => void): () => void
  getVersion(): number
}

export interface ExtensionRegistryBuilder {
  registerExtension(registration: ExtensionRegistration): void
}

export type ExtensionRuntime = ExtensionRegistry & ExtensionRegistryBuilder

export interface ExtensionModule {
  register(registry: ExtensionRegistryBuilder): void | Promise<void>
}

export interface ExtensionDescriptor {
  id: string
  load: () => Promise<ExtensionModule>
  enabled?: boolean
  order?: number
  source?: string
}
