'use client'

import '../styles/globals.css'
import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

export const dynamic = 'force-static'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <html lang="en">
      <body className="flex min-h-screen overflow-x-hidden">
        <Sidebar
          className={`fixed inset-y-0 left-0 z-20 transform transition-transform bg-gray-100 md:static md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
          onNavigate={() => setOpen(false)}
        />
        <div className="flex flex-col flex-1">
          <Header onMenu={() => setOpen(!open)} />
          <main className="flex-1 p-4 md:ml-64">{children}</main>
        </div>
      </body>
    </html>
  )
}
