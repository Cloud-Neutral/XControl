'use client'

export default function Header({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="flex items-center justify-between bg-white shadow px-4 py-3 border-b">
      <button className="md:hidden" onClick={onMenu}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="text-lg font-semibold">XControl Admin</div>

      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-600">admin@example.com</span>
        <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center">
          A
        </div>
      </div>
    </header>
  )
}
