'use client'

import type { ReactNode } from 'react'

import { LanguageProvider } from '@i18n/LanguageProvider'
import { UserProvider } from '@lib/userStore'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <UserProvider>{children}</UserProvider>
    </LanguageProvider>
  )
}
