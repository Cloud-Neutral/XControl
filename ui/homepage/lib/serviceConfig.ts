import runtimeServiceConfig from '../config/runtime-service-config.json'

const DEFAULT_ACCOUNT_SERVICE_URL = 'https://account.svc.plus'
const DEFAULT_SERVER_SERVICE_URL = 'http://localhost:8090'

type RuntimeEnvironmentName = keyof typeof runtimeServiceConfig.environments

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

    const matchedEntry = Object.keys(runtimeServiceConfig.environments).find(
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
    ? runtimeServiceConfig.environments[environmentName]?.accountService?.baseUrl
    : undefined

  return environmentValue ?? runtimeDefaults
}

function readEnvValue(...keys: string[]): string | undefined {
  for (const key of keys) {
    const raw = process.env[key]
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
  }
  return undefined
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

export function getAccountServiceBaseUrl(): string {
  const configured = readEnvValue('ACCOUNT_SERVICE_URL', 'NEXT_PUBLIC_ACCOUNT_SERVICE_URL')
  const runtimeConfigured = getRuntimeAccountServiceBaseUrl()
  return normalizeBaseUrl(configured ?? runtimeConfigured ?? DEFAULT_ACCOUNT_SERVICE_URL)
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
