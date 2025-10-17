import { describe, expect, it, vi } from 'vitest'

import { listAppModules } from '../../app/manifest'
import { createExtensionRuntime, loadExtension } from '../loader'

describe('extension runtime', () => {
  it('exposes builtin panel modules through the app manifest', () => {
    const modules = listAppModules()
    expect(modules.some((entry) => entry.path === '/panel')).toBe(true)
  })

  it('supports toggling optional extensions without affecting builtin routes', async () => {
    const runtime = createExtensionRuntime()
    const panelRoute = runtime.findRouteByPath('/panel')
    expect(panelRoute).toBeTruthy()

    const loadSpy = vi.fn(async () => ({
      async register(registry) {
        registry.registerExtension({
          id: 'test.optional',
          meta: {
            displayName: 'Optional test module',
            description: 'Runtime injected extension used by tests.',
            order: 999,
          },
          routes: [
            {
              id: 'test.optional.route',
              path: '/panel/test-extension',
              layout: 'panel',
              component: () => null,
              guard: { requireLogin: true },
              redirect: { unauthenticated: '/login' },
            },
          ],
          menu: [
            {
              id: 'test.optional.menu',
              routeId: 'test.optional.route',
              section: '测试扩展',
              label: 'Test Extension',
              description: '验证扩展注册与隔离能力。',
              disabled: false,
            },
          ],
        })
      },
    }))

    await loadExtension(
      {
        id: 'test.optional',
        enabled: false,
        load: loadSpy,
      },
      { runtime },
    )

    expect(loadSpy).not.toHaveBeenCalled()
    expect(runtime.findRouteByPath('/panel')).toBe(panelRoute)
    expect(runtime.listRoutes().some((route) => route.id === 'test.optional.route')).toBe(false)

    await loadExtension(
      {
        id: 'test.optional',
        load: loadSpy,
      },
      { runtime },
    )

    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(runtime.findRouteByPath('/panel')).toBe(panelRoute)
    const optionalRoute = runtime.listRoutes().find((route) => route.id === 'test.optional.route')
    expect(optionalRoute).toBeTruthy()
    expect(optionalRoute?.extensionId).toBe('test.optional')
  })
})
