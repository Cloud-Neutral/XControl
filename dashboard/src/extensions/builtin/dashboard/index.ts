import { Home } from 'lucide-react'

import type { ExtensionRegistration } from '../../types'

import UserOverview from './UserOverview'

export { default as DashboardPage } from './UserOverview'

export const dashboardExtension: ExtensionRegistration = {
  id: 'builtin.dashboard',
  meta: {
    displayName: 'User dashboard',
    description: 'Personalized overview for signed-in users.',
    icon: Home,
    category: 'user-center',
    order: 0,
    tags: ['core', 'builtin'],
  },
  routes: [
    {
      id: 'panel.dashboard',
      path: '/panel',
      layout: 'panel',
      component: UserOverview,
      guard: { requireLogin: true },
      redirect: { unauthenticated: '/login' },
    },
  ],
  menu: [
    {
      id: 'panel.dashboard.menu',
      routeId: 'panel.dashboard',
      section: '用户中心',
      label: 'Dashboard',
      description: '专属于你的信息总览',
      icon: Home,
      allowWhenMfaPending: true,
    },
  ],
}
