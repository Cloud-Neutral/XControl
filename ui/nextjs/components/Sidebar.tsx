import Link from 'next/link'

export interface SidebarProps {
  className?: string
  onNavigate?: () => void
}

const menu = [
  { href: '/', label: 'Home' },
  { href: '/agent', label: 'Agent' },
  { href: '/api', label: 'API' },
  { href: '/subscription', label: 'Subscription' },
  { href: '/xray', label: 'XRay' },
]

export default function Sidebar({ className = '', onNavigate }: SidebarProps) {
  return (
    <nav className={`w-64 bg-gray-100 p-4 space-y-2 ${className}`}>
      {menu.map(m => (
        <Link
          key={m.href}
          href={m.href}
          className="block p-2 rounded hover:bg-gray-200"
          onClick={onNavigate}
        >
          {m.label}
        </Link>
      ))}
    </nav>
  )
}
