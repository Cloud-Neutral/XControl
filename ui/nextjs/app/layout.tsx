import '../styles/globals.css'
import Sidebar from '../components/Sidebar'

export const dynamic = 'force-static'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-4">{children}</main>
      </body>
    </html>
  )
}
