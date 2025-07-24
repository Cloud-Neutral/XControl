'use client'

import { useState } from 'react'
import { AskAIDialog } from './AskAIDialog'

export function AskAIButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-indigo-100 text-indigo-700 font-semibold rounded-xl p-4 shadow-md hover:shadow-lg"
      >
        <img src="/askai-icon.png" className="w-6 h-6 inline mr-2" />
        Ask AI
      </button>

      <AskAIDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
