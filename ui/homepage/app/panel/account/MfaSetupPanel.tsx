'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import Card from '../components/Card'
import { useLanguage } from '@i18n/LanguageProvider'
import { translations } from '@i18n/translations'
import { useUser } from '@lib/userStore'

type TotpStatus = {
  totpEnabled?: boolean
  totpPending?: boolean
  totpSecretIssuedAt?: string
  totpConfirmedAt?: string
}

type ProvisionResponse = {
  secret?: string
  uri?: string
  issuer?: string
  account?: string
  user?: { mfa?: TotpStatus }
  error?: string
}

type VerifyResponse = {
  success?: boolean
  recoveryCodes?: string[]
  user?: { mfa?: TotpStatus }
  error?: string
}

function formatTimestamp(value?: string) {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

export default function MfaSetupPanel() {
  const { language } = useLanguage()
  const copy = translations[language].userCenter.mfa
  const recoveryTemplate = translations[language].auth.login.alerts.mfa.recoveryCodes
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, refresh } = useUser()

  const [status, setStatus] = useState<TotpStatus | null>(null)
  const [secret, setSecret] = useState('')
  const [uri, setUri] = useState('')
  const [code, setCode] = useState('')
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasPendingMfa = Boolean(status?.totpPending && !status?.totpEnabled)
  const setupRequested = searchParams.get('setupMfa') === '1'

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/mfa/status', { cache: 'no-store' })
      const payload = (await response.json().catch(() => ({}))) as {
        mfa?: TotpStatus
        user?: { mfa?: TotpStatus }
      }
      if (response.ok) {
        setStatus(payload?.mfa ?? payload?.user?.mfa ?? null)
      }
    } catch (err) {
      console.warn('Failed to fetch MFA status', err)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  const handleProvision = useCallback(async () => {
    setIsProvisioning(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/mfa/totp/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const payload = (await response.json().catch(() => ({}))) as ProvisionResponse
      if (!response.ok || !payload?.secret) {
        setError(payload?.error ?? copy.error)
        return
      }
      setSecret(payload.secret)
      setUri(payload?.uri ?? '')
      setStatus(payload?.user?.mfa ?? status)
    } catch (err) {
      console.warn('Provision TOTP failed', err)
      setError(copy.error)
    } finally {
      setIsProvisioning(false)
    }
  }, [copy.error, status])

  const handleVerify = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!code.trim()) {
        setError(copy.codePlaceholder)
        return
      }
      setIsVerifying(true)
      setError(null)
      try {
        const response = await fetch('/api/auth/mfa/totp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code.trim() }),
        })
        const payload = (await response.json().catch(() => ({}))) as VerifyResponse
        if (!response.ok || !payload?.success) {
          setError(payload?.error ?? copy.error)
          return
        }
        setStatus(payload?.user?.mfa ?? { totpEnabled: true })
        setSecret('')
        setUri('')
        setCode('')
        await refresh()
        if (Array.isArray(payload.recoveryCodes) && payload.recoveryCodes.length > 0) {
          const message = recoveryTemplate
            ? recoveryTemplate.replace('{codes}', payload.recoveryCodes.join(', '))
            : `Recovery codes: ${payload.recoveryCodes.join(', ')}`
          alert(message)
        }
        if (setupRequested) {
          alert('Registration complete with MFA enabled')
          router.replace('/')
        } else {
          router.replace('/panel/account')
        }
        router.refresh()
      } catch (err) {
        console.warn('Verify TOTP failed', err)
        setError(copy.error)
      } finally {
        setIsVerifying(false)
      }
    },
    [code, copy.codePlaceholder, copy.error, refresh, router, setupRequested],
  )

  const showProvisionButton = !status?.totpEnabled
  const provisionLabel = secret ? copy.regenerate : copy.generate

  const displayStatus = useMemo(() => status ?? user?.mfa ?? null, [status, user?.mfa])

  useEffect(() => {
    if (setupRequested && showProvisionButton && !secret && !hasPendingMfa) {
      void handleProvision()
    }
  }, [handleProvision, hasPendingMfa, secret, setupRequested, showProvisionButton])

  if (!user) {
    return (
      <Card>
        <h2 className="text-xl font-semibold text-gray-900">{copy.title}</h2>
        <p className="mt-2 text-sm text-gray-600">{copy.pendingHint}</p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{copy.title}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {displayStatus?.totpEnabled ? copy.enabledHint : copy.subtitle}
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{copy.secretLabel}</span>
            {showProvisionButton ? (
              <button
                type="button"
                onClick={handleProvision}
                disabled={isProvisioning}
                className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isProvisioning ? `${copy.generate}…` : provisionLabel}
              </button>
            ) : null}
          </div>
          <code className="block rounded-md bg-white px-3 py-2 text-sm text-purple-600 shadow-inner">
            {secret || '••••••••••••'}
          </code>
          {uri ? (
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-700">{copy.uriLabel}</span>
              <code className="block break-all rounded-md bg-white px-3 py-2 text-xs text-purple-600 shadow-inner">{uri}</code>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600 sm:grid-cols-2">
          <div>
            <span className="font-medium text-gray-700">{copy.status.issuedAt}</span>
            <p className="mt-1">{formatTimestamp(displayStatus?.totpSecretIssuedAt)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">{copy.status.confirmedAt}</span>
            <p className="mt-1">{formatTimestamp(displayStatus?.totpConfirmedAt)}</p>
          </div>
        </div>

        {showProvisionButton ? (
          <form onSubmit={handleVerify} className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-700">
                {copy.codeLabel}
              </label>
              <input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={copy.codePlaceholder}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-900 shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={isVerifying}
              className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isVerifying ? copy.verifying : copy.verify}
            </button>
          </form>
        ) : null}
      </div>
    </Card>
  )
}
