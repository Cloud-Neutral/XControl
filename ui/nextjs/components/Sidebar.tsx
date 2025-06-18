import Link from 'next/link'

const menu = [
  { href: '/', label: 'Home' },
  { href: '/agent', label: 'Agent' },
  { href: '/api', label: 'API' },
  { href: '/subscription', label: 'Subscription' },
  { href: '/xray', label: 'XRay' },
]

export default function Sidebar() {
  return (
    <nav className="w-48 bg-gray-100 p-4 space-y-2">
      {menu.map(m => (
        <Link key={m.href} href={m.href} className="block p-2 rounded hover:bg-gray-200">
          {m.label}
        </Link>
      ))}
    </nav>
  )
}
