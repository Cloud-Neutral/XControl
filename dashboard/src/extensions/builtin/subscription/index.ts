import { CreditCard } from 'lucide-react'

import type { ExtensionRegistration } from '../../types'

import SubscriptionPage from './SubscriptionPage'

export { default as SubscriptionPage } from './SubscriptionPage'

export const subscriptionExtension: ExtensionRegistration = {
  id: 'builtin.subscription',
  meta: {
    displayName: 'Subscription center',
    description: 'Control pricing plans and entitlement policies.',
    icon: CreditCard,
    category: 'features',
    order: 40,
    tags: ['core', 'preview'],
  },
  routes: [
    {
      id: 'panel.subscription',
      path: '/panel/subscription',
      layout: 'panel',
      component: SubscriptionPage,
      guard: { requireLogin: true },
      redirect: { unauthenticated: '/login' },
    },
  ],
  menu: [
    {
      id: 'panel.subscription.menu',
      routeId: 'panel.subscription',
      section: '功能特性',
      label: 'Subscription',
      description: '订阅方案与计费规则',
      icon: CreditCard,
      disabled: true,
    },
  ],
}
