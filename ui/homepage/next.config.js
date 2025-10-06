/**
 * 功能控制的树形结构，每个节点都可以通过 enabled 控制是否启用。
 * - children 支持精确路径、动态段([param])、以及通配符(*)。
 * - 当某个节点 enabled 为 false 时，其所有子级都会默认关闭。
 */
const fs = require('node:fs')
const path = require('node:path')

const featureToggles = require('./config/feature-toggles.json')

const normalizeSegments = (pathname = '') =>
  pathname
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean)

const findDynamicChildKey = (children = {}) =>
  Object.keys(children).find((key) => /^\[(\.\.\.)?.+\]$/.test(key))

const resolveToggle = (node, segments) => {
  if (!node) return true
  const isEnabled = node.enabled !== false
  if (!isEnabled) return false
  if (!segments.length) return isEnabled

  const children = node.children || {}
  const [current, ...rest] = segments
  const exactChild = children[current]
  const dynamicChildKey = findDynamicChildKey(children)
  const wildcardChild = children['*']
  const nextNode =
    exactChild ?? (dynamicChildKey ? children[dynamicChildKey] : undefined) ?? wildcardChild

  if (!nextNode) return isEnabled
  return resolveToggle(nextNode, rest)
}

const isFeatureEnabled = (section, pathname) => {
  const tree = featureToggles[section]
  if (!tree) return true
  const segments = normalizeSegments(pathname)
  return resolveToggle(tree, segments)
}

// Static exports are incompatible with dynamic route handlers used for auth.
// Allow opting-in explicitly to avoid breaking the default production build.
const shouldUseStaticExport = process.env.NEXT_SHOULD_EXPORT === 'true'

/** @type {import('next').NextConfig} */
const FALLBACK_ACCOUNT_SERVICE_URL = 'http://localhost:8080'

const normalizeProxyTarget = (value) => {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.replace(/\/+$/, '')
}

const readEnvValue = (...keys) => {
  for (const key of keys) {
    const raw = process.env[key]
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim()
    }
  }
  return ''
}

const loadRuntimeServiceConfig = () => {
  try {
    const configPath = path.join(__dirname, 'config', 'runtime-service-config.yaml')
    const source = fs.readFileSync(configPath, 'utf8')
    return parseSimpleYaml(source)
  } catch (error) {
    console.warn('Failed to read runtime service config, falling back to defaults', error)
    return {}
  }
}

const parseSimpleYaml = (source) => {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, ''))
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line) => line.trim().length > 0)

  const root = {}
  const stack = [{ indent: -1, value: root }]

  for (const line of lines) {
    const indent = line.match(/^\s*/)[0].length
    const trimmed = line.trim()
    const separatorIndex = trimmed.indexOf(':')
    if (separatorIndex === -1) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop()
    }

    const parent = stack[stack.length - 1].value

    if (rawValue.length === 0) {
      const child = {}
      parent[key] = child
      stack.push({ indent, value: child })
    } else {
      parent[key] = rawValue
    }
  }

  return root
}

const runtimeServiceConfig = loadRuntimeServiceConfig()
const runtimeEnvironments = runtimeServiceConfig.environments || {}

const normalizeEnvKey = (value) => {
  if (!value) return ''
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

const resolveRuntimeEnvironment = () => {
  const envCandidates = [
    process.env.NEXT_PUBLIC_RUNTIME_ENV,
    process.env.NEXT_RUNTIME_ENV,
    process.env.RUNTIME_ENV,
    process.env.APP_ENV,
    process.env.NODE_ENV,
    runtimeServiceConfig.defaultEnvironment,
  ]

  for (const candidate of envCandidates) {
    const normalizedCandidate = normalizeEnvKey(candidate)
    if (!normalizedCandidate) continue

    const matchedEntry = Object.keys(runtimeEnvironments).find(
      (key) => normalizeEnvKey(key) === normalizedCandidate,
    )
    if (matchedEntry) {
      return matchedEntry
    }
  }

  return ''
}

const getRuntimeServiceBaseUrl = (serviceKey) => {
  const environmentName = resolveRuntimeEnvironment()
  const runtimeDefaults = runtimeServiceConfig.defaults?.[serviceKey]?.baseUrl
  const environmentValue = environmentName
    ? runtimeEnvironments[environmentName]?.[serviceKey]?.baseUrl
    : undefined

  return environmentValue || runtimeDefaults || ''
}

const resolveAccountServiceBaseUrl = () => {
  const envOverride = readEnvValue(
    'NEXT_API_PROXY_TARGET',
    'ACCOUNT_SERVICE_URL',
    'NEXT_PUBLIC_ACCOUNT_SERVICE_URL',
  )
  if (envOverride) {
    return normalizeProxyTarget(envOverride)
  }

  const runtimeValue = getRuntimeServiceBaseUrl('accountService')
  if (runtimeValue) {
    return normalizeProxyTarget(runtimeValue)
  }

  return normalizeProxyTarget(FALLBACK_ACCOUNT_SERVICE_URL)
}

const apiProxyTarget = resolveAccountServiceBaseUrl()

const nextConfig = {
  ...(shouldUseStaticExport ? { output: 'export' } : {}),
  trailingSlash: true,
  reactStrictMode: true,
  compress: false, // 压缩交给 Nginx，省 Node CPU
  images: {
    unoptimized: true,
  }, // 关闭服务端图片处理
  webpack(config) {
    config.module.rules.push({
      test: /\.ya?ml$/i,
      type: 'asset/source',
    })
    return config
  },
  async rewrites() {
    if (shouldUseStaticExport || !apiProxyTarget) {
      return []
    }

    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: `${apiProxyTarget}/api/:path*`, // 后端服务（根据 runtime-service-config.yaml 配置或环境变量代理到 account 服务）
        },
      ],
    }
  },
}
module.exports = nextConfig
