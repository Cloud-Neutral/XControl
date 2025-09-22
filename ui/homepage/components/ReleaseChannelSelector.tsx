'use client'

import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../i18n/LanguageProvider'
import { translations } from '../i18n/translations'

export type ReleaseChannel = 'stable' | 'beta' | 'develop'

type ReleaseChannelSelectorProps = {
  selected: ReleaseChannel[]
  onToggle: (channel: ReleaseChannel) => void
}

const CHANNEL_ORDER: ReleaseChannel[] = ['stable', 'beta', 'develop']

export default function ReleaseChannelSelector({ selected, onToggle }: ReleaseChannelSelectorProps) {
  const { language } = useLanguage()
  const labels = translations[language].nav.releaseChannels
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (containerRef.current.contains(event.target as Node)) return
      setOpen(false)
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const selectedNames = CHANNEL_ORDER.filter((channel) => selected.includes(channel)).map(
    (channel) => labels[channel].name,
  )
  const summary = selectedNames.length > 0 ? selectedNames.join(' / ') : labels.stable.name
  const tooltip = CHANNEL_ORDER.map((channel) => {
    const channelLabels = labels[channel]
    const indicator = selected.includes(channel) ? '✓' : '•'
    return `${indicator} ${channelLabels.name}: ${channelLabels.description}`
  }).join('\n')

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-white/80 px-2 py-1 text-xs text-gray-700 shadow-sm transition hover:border-purple-300 hover:text-purple-600 md:w-auto md:justify-start"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={labels.label}
        title={tooltip}
      >
        <span className="font-semibold text-gray-600">{labels.label}</span>
        <span className="text-[10px] text-gray-500">
          {labels.summaryPrefix}: {summary}
        </span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-md border border-gray-200 bg-white shadow-lg">
          <ul className="py-2 text-sm text-gray-700" role="listbox" aria-label={labels.label}>
            {CHANNEL_ORDER.map((channel) => {
              const channelLabels = labels[channel]
              const checked = selected.includes(channel)
              const isStable = channel === 'stable'
              return (
                <li key={channel}>
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      checked={checked}
                      onChange={() => (!isStable ? onToggle(channel) : undefined)}
                      disabled={isStable}
                    />
                    <div>
                      <div className="font-medium text-gray-900">{channelLabels.name}</div>
                      <p className="text-xs text-gray-500">{channelLabels.description}</p>
                    </div>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
