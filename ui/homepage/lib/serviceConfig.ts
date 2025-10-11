import runtimeServiceConfigSource from '../config/runtime-service-config.yaml'

type ServiceRuntimeConfig = {
  baseUrl?: string
}

type EnvironmentRuntimeConfig = {
  accountService?: ServiceRuntimeConfig
  serverService?: ServiceRuntimeConfig
}

type RuntimeServiceConfig = {
  defaultEnvironment?: string
  defaults?: EnvironmentRuntimeConfig
  environments?: Record<string, EnvironmentRuntimeConfig>
}

type StackEntry = {
  indent: number
  value: Record<string, unknown>
}

function parseSimpleYaml(source: string): RuntimeServiceConfig {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, ''))
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line) => line.trim().length > 0)

  const root: Record<string, unknown> = {}
  const stack: StackEntry[] = [{ indent: -1, value: root }]

  for (const line of lines) {
    const indent = line.match(/^\s*/)![0].length
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
      const child: Record<string, unknown> = {}
      parent[key] = child
      stack.push({ indent, value: child })
    } else {
      parent[key] = rawValue
    }
  }

  return root as RuntimeServiceConfig
}

const runtimeServiceConfig = parseSimpleYaml(runtimeServiceConfigSource)

const runtimeEnvironments: Record<string, EnvironmentRuntimeConfig> =
  runtimeServiceConfig.environments ?? {}

type ServiceKey = keyof EnvironmentRuntimeConfig

const FALLBACK_ACCOUNT_SERVICE_URL = 'http://localhost:8080'
const FALLBACK_SERVER_SERVICE_URL = 'http://localhost:8090'

function getRuntimeServiceBaseUrl(serviceKey: ServiceKey): string | undefined {
  const environmentName = resolveRuntimeEnvironment()
  const runtimeDefaults = runtimeServiceConfig.defaults?.[serviceKey]?.baseUrl
  const environmentValue = environmentName
    ? runtimeEnvironments[environmentName]?.[serviceKey]?.baseUrl
    : undefined

  return environmentValue ?? runtimeDefaults
}

const DEFAULT_ACCOUNT_SERVICE_URL =
  getRuntimeServiceBaseUrl('accountService') ?? FALLBACK_ACCOUNT_SERVICE_URL
const DEFAULT_SERVER_SERVICE_URL =
  getRuntimeServiceBaseUrl('serverService') ?? FALLBACK_SERVER_SERVICE_URL

type RuntimeEnvironmentName = keyof typeof runtimeEnvironments

function normalizeEnvKey(value?: string | null): string | undefined {
  if (!value) return undefined
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function resolveRuntimeEnvironment(): RuntimeEnvironmentName | undefined {
  const envCandidates = [
    readEnv('NEXT_PUBLIC_RUNTIME_ENV'),
    readEnv('NEXT_RUNTIME_ENV'),
    readEnv('RUNTIME_ENV'),
    readEnv('APP_ENV'),
    readEnv('NODE_ENV'),
    runtimeServiceConfig.defaultEnvironment,
  ]

  for (const candidate of envCandidates) {
    const normalizedCandidate = normalizeEnvKey(candidate)
    if (!normalizedCandidate) continue

    const matchedEntry = Object.keys(runtimeEnvironments).find(
      (key) => normalizeEnvKey(key) === normalizedCandidate,
    ) as RuntimeEnvironmentName | undefined

    if (matchedEntry) {
      return matchedEntry
    }
  }

  return undefined
}

function getRuntimeAccountServiceBaseUrl(): string | undefined {
  const environmentName = resolveRuntimeEnvironment()
  const runtimeDefaults = runtimeServiceConfig.defaults?.accountService?.baseUrl
  const environmentValue = environmentName
    ? runtimeEnvironments[environmentName]?.accountService?.baseUrl
    : undefined

  return runtimeDefaults ?? environmentValue
}

type EnvReader = { env?: { get?(name: string): string | undefined } }

function readEnv(name: string): string | undefined {
  const deno = (globalThis as { Deno?: EnvReader }).Deno
  const denoValue = deno?.env?.get?.(name)
  if (typeof denoValue === 'string' && denoValue.trim().length > 0) {
    return denoValue.trim()
  }
  if (typeof process !== 'undefined' && typeof process.env === 'object') {
    const nodeValue = process.env[name]
    if (typeof nodeValue === 'string' && nodeValue.trim().length > 0) {
      return nodeValue.trim()
    }
  }
  return undefined
}

function readEnvValue(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readEnv(key)
    if (value) {
      return value
    }
  }
  return undefined
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

export function getAccountServiceBaseUrl(): string {
  const configured = readEnvValue('ACCOUNT_SERVICE_URL', 'NEXT_PUBLIC_ACCOUNT_SERVICE_URL')
  return normalizeBaseUrl(configured ?? DEFAULT_ACCOUNT_SERVICE_URL)
}

export function getServerServiceBaseUrl(): string {
  const configured = readEnvValue(
    'SERVER_SERVICE_URL',
    'NEXT_PUBLIC_SERVER_SERVICE_URL',
    'NEXT_PUBLIC_API_BASE_URL',
  )
  return normalizeBaseUrl(configured ?? DEFAULT_SERVER_SERVICE_URL)
}

export const serviceConfig = {
  account: {
    baseUrl: getAccountServiceBaseUrl(),
  },
  server: {
    baseUrl: getServerServiceBaseUrl(),
  },
} as const
