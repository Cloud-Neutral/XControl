import { Settings } from 'lucide-react'

import type { ExtensionRegistration } from '../../types'

import ManagementPage from './page'

export { default as ManagementPage } from './page'

export const managementExtension: ExtensionRegistration = {
  id: 'builtin.management',
  meta: {
    displayName: 'Administrative workspace',
    description: 'High-touch controls for operators and administrators.',
    icon: Settings,
    category: 'administration',
    order: 60,
    tags: ['core', 'admin'],
  },
  routes: [
    {
      id: 'panel.management',
      path: '/panel/management',
      layout: 'panel',
      component: ManagementPage,
      guard: { requireLogin: true, roles: ['admin', 'operator'] },
      redirect: { unauthenticated: '/login', forbidden: '/panel' },
    },
  ],
  menu: [
    {
      id: 'panel.management.menu',
      routeId: 'panel.management',
      section: '管理页面',
      label: 'Management',
      description: '集中化的权限矩阵与用户编排',
      icon: Settings,
    },
  ],
}
