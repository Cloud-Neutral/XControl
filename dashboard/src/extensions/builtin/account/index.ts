import { User } from 'lucide-react'

import type { ExtensionRegistration } from '../../types'

import AccountPage from './AccountPage'

export { default as AccountPage } from './AccountPage'
export { default as MfaSetupPanel } from './MfaSetupPanel'

export const accountExtension: ExtensionRegistration = {
  id: 'builtin.account',
  meta: {
    displayName: 'Account security',
    description: 'Account profile and MFA management tools.',
    icon: User,
    category: 'user-center',
    order: 10,
    tags: ['core', 'security'],
  },
  routes: [
    {
      id: 'panel.account',
      path: '/panel/account',
      layout: 'panel',
      component: AccountPage,
      guard: { requireLogin: true },
      redirect: { unauthenticated: '/login' },
    },
  ],
  menu: [
    {
      id: 'panel.account.menu',
      routeId: 'panel.account',
      section: '权限设置',
      label: 'Accounts',
      description: '目录与多因素设置',
      icon: User,
      allowWhenMfaPending: true,
    },
  ],
}
