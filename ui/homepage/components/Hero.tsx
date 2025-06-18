'use client'
import { useLanguage } from '../i18n/LanguageProvider'
import { translations } from '../i18n/translations'

export default function Hero() {
  const { language } = useLanguage()
  const t = translations[language].hero

  return (
    <section className="hero py-20 bg-gradient-to-br from-purple-800 via-indigo-800 to-blue-900 text-white">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">{t.title}</h1>
        <p className="text-lg md:text-xl mb-8 text-gray-300">{t.description}</p>
        <div className="flex justify-center gap-4">
          <a href="#get-started" className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-full text-white font-semibold">
            {t.start}
          </a>
          <a href="#features" className="border border-white px-6 py-3 rounded-full text-white hover:bg-white/10">
            {t.learn}
          </a>
        </div>
      </div>
    </section>
  )
}
