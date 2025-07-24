'use client'

import { useState } from 'react'
import { Bot } from 'lucide-react'
import { AskAIDialog } from './AskAIDialog'

export function AskAIButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-purple-600 text-white px-4 py-3 shadow-lg hover:bg-purple-500"
      >
        <Bot className="w-5 h-5" />
        Ask AI
      </button>

      <AskAIDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
