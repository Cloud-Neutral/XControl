export interface HeaderProps {
  onMenu?: () => void
}

export default function Header({ onMenu }: HeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-white shadow md:ml-64">
      <button
        className="md:hidden p-2 text-gray-600"
        onClick={onMenu}
        aria-label="Toggle navigation"
      >
        {/* simple hamburger icon */}
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 className="text-lg font-bold flex-1 text-center md:text-left">XControl Admin</h1>
    </header>
  )
}
