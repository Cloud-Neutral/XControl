export const dynamic = 'error'

import { notFound } from 'next/navigation'

import { isFeatureEnabled } from '@lib/featureToggles'

import LoginContent from './LoginContent'

export default function LoginPage() {
  if (!isFeatureEnabled('globalNavigation', '/login')) {
    notFound()
  }

  return <LoginContent />
}
