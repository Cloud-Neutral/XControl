import { Code } from 'lucide-react'

import type { ExtensionRegistration } from '../../types'

import ApiPage from './ApiPage'

export { default as ApiPage } from './ApiPage'

export const apiExtension: ExtensionRegistration = {
  id: 'builtin.api',
  meta: {
    displayName: 'API diagnostics',
    description: 'Inspect backend APIs and integration surface area.',
    icon: Code,
    category: 'features',
    order: 30,
    tags: ['core', 'preview'],
  },
  routes: [
    {
      id: 'panel.api',
      path: '/panel/api',
      layout: 'panel',
      component: ApiPage,
      guard: { requireLogin: true },
      redirect: { unauthenticated: '/login' },
    },
  ],
  menu: [
    {
      id: 'panel.api.menu',
      routeId: 'panel.api',
      section: '功能特性',
      label: 'APIs',
      description: '洞察后端服务',
      icon: Code,
      disabled: true,
    },
  ],
}
