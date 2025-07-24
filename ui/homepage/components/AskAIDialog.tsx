'use client'

import { useState } from 'react'
import { ChatBubble } from './ChatBubble'
import { SourceHint } from './SourceHint'

export function AskAIDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)

  async function handleAsk() {
    if (!question) return
    const res = await fetch('/api/askai', {
      method: 'POST',
      body: JSON.stringify({ question }),
    })
    const data = await res.json()
    setAnswer(data.answer)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center">
      <div className="bg-white w-full max-w-xl rounded-2xl p-6 m-4 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-500 hover:text-gray-800"
        >
          ✕
        </button>
        <h2 className="text-lg font-semibold mb-3">Ask anything about your docs</h2>

        <textarea
          className="w-full border p-3 rounded-lg mb-4 text-black"
          rows={3}
          placeholder="Type your question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <button
          onClick={handleAsk}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          Ask
        </button>

        {answer && (
          <div className="mt-6 border-t pt-4 text-gray-800">
            <div className="text-sm font-bold mb-2">Conversation:</div>
            <ChatBubble message={question} type="user" />
            <ChatBubble message={answer} type="ai" />

            <SourceHint />
          </div>
        )}
      </div>
    </div>
  )
}
