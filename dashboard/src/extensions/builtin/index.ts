import type { ExtensionRegistration, ExtensionRegistryBuilder } from '../types'

import { accountExtension } from './account'
import { agentExtension } from './agent'
import { apiExtension } from './api'
import { dashboardExtension } from './dashboard'
import { ldpExtension } from './ldp'
import { managementExtension } from './management'
import { subscriptionExtension } from './subscription'

export const builtinExtensions: ExtensionRegistration[] = [
  dashboardExtension,
  accountExtension,
  agentExtension,
  apiExtension,
  subscriptionExtension,
  ldpExtension,
  managementExtension,
].map((extension) => ({ ...extension, source: 'builtin' }))

export function registerBuiltinExtensions(registry: ExtensionRegistryBuilder) {
  for (const extension of builtinExtensions) {
    registry.registerExtension(extension)
  }
}
