import Link from 'next/link'

import Card from '@extensions/components/Card'

const LINKS = [
  { href: '/panel/ldp/users', label: 'Users' },
  { href: '/panel/ldp/services', label: 'Services' },
  { href: '/panel/ldp/config', label: 'Configuration' },
  { href: '/panel/ldp/status', label: 'Status' },
  { href: '/panel/ldp/consent', label: 'Login & Consent' },
] as const

export default function LdpPage() {
  return (
    <Card>
      <h1 className="text-2xl font-semibold text-gray-900">LDP Management</h1>
      <p className="mt-2 text-sm text-gray-600">Explore low-latency directory plane modules.</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-purple-400 hover:text-purple-600"
            >
              {link.label}
              <span className="text-xs text-gray-400 transition group-hover:text-purple-400">Coming soon</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
