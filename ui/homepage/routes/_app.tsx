export const dynamic = 'error'

import { AppProviders } from '@components/AppProviders'
import './globals.css'

export const metadata = {
  title: 'CloudNative Suite',
  description: 'Unified tools for your cloud native stack',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
