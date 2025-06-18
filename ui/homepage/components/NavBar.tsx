'use client'
import LanguageToggle from './LanguageToggle'

export default function NavBar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-black/30 backdrop-blur border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <a href="#" className="text-xl font-bold text-white flex items-center gap-2">
          <img src="/icons/cloudnative_32.png" alt="logo" className="w-6 h-6" />
          CloudNative Suite
        </a>
        <div className="hidden md:flex items-center gap-6 text-sm text-white">
          <a href="#features" className="hover:text-purple-300">Features</a>
          <a href="#open-sources" className="hover:text-purple-300">Open Source</a>
          <a href="#download" className="hover:text-purple-300">Download</a>
          <a href="#contact" className="hover:text-purple-300">Contact</a>
          <LanguageToggle />
        </div>
      </div>
    </nav>
  )
}
// This component defines a responsive navigation bar with links to different sections of the homepage.