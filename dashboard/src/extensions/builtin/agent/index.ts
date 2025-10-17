import { Server } from 'lucide-react'

import type { ExtensionRegistration } from '../../types'

import AgentPage from './AgentPage'

export { default as AgentPage } from './AgentPage'

export const agentExtension: ExtensionRegistration = {
  id: 'builtin.agent',
  meta: {
    displayName: 'Runtime agents',
    description: 'Operate and observe runtime agents.',
    icon: Server,
    category: 'features',
    order: 20,
    tags: ['core', 'preview'],
  },
  routes: [
    {
      id: 'panel.agent',
      path: '/panel/agent',
      layout: 'panel',
      component: AgentPage,
      guard: { requireLogin: true },
      redirect: { unauthenticated: '/login' },
    },
  ],
  menu: [
    {
      id: 'panel.agent.menu',
      routeId: 'panel.agent',
      section: '功能特性',
      label: 'Agents',
      description: '管理运行时节点',
      icon: Server,
      disabled: true,
    },
  ],
}
