import { Shield } from 'lucide-react'

import type { ExtensionRegistration } from '../../types'

import LdpPage from './LdpPage'

export { default as LdpPage } from './LdpPage'

export const ldpExtension: ExtensionRegistration = {
  id: 'builtin.ldp',
  meta: {
    displayName: 'Low latency directory plane',
    description: 'Manage LDP resources and configuration.',
    icon: Shield,
    category: 'permissions',
    order: 50,
    tags: ['core', 'preview'],
  },
  routes: [
    {
      id: 'panel.ldp',
      path: '/panel/ldp',
      layout: 'panel',
      component: LdpPage,
      guard: { requireLogin: true },
      redirect: { unauthenticated: '/login' },
    },
  ],
  menu: [
    {
      id: 'panel.ldp.menu',
      routeId: 'panel.ldp',
      section: '权限设置',
      label: 'LDP',
      description: '低时延身份平面',
      icon: Shield,
      disabled: true,
    },
  ],
}
