'use client'
import { useLanguage } from '../i18n/LanguageProvider'

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage()
  const tooltip = language === 'en' ? 'Switch language / 切换语言' : '切换语言 / Switch language'

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value as 'en' | 'zh')}
      className="w-full rounded-md border border-gray-200 bg-white/80 px-2 py-1 text-xs text-gray-700 shadow-sm transition hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 md:w-auto"
      aria-label={tooltip}
      title={tooltip}
    >
      <option value="en">English</option>
      <option value="zh">中文</option>
    </select>
  )
}
// This component provides a dropdown to toggle between English and Chinese languages.