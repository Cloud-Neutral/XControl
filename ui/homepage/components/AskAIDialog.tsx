'use client'

import { useState } from 'react'
import { ChatBubble } from './ChatBubble'
import { SourceHint } from './SourceHint'

const MAX_MESSAGES = 20

export function AskAIDialog({ open, onMinimize, onEnd }: { open: boolean; onMinimize: () => void; onEnd: () => void }) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([])

  async function handleAsk() {
    if (!question) return
    const userMessage = { sender: 'user' as const, text: question }
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''
    const trimmedHistory = messages.slice(-MAX_MESSAGES)
    const res = await fetch(`${apiBase}/api/askai`, {
      method: 'POST',
      body: JSON.stringify({ question, history: trimmedHistory })
    })
    const data = await res.json()
    const aiMessage = { sender: 'ai' as const, text: data.answer as string }
    setMessages(prev => {
      const newMessages = [...prev, userMessage, aiMessage]
      return newMessages.slice(-MAX_MESSAGES)
    })
    setQuestion('')
  }

  function handleEnd() {
    setMessages([])
    setQuestion('')
    onEnd()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center">
      <div className="bg-white w-full max-w-xl rounded-2xl p-6 m-4 shadow-xl relative">
        <div className="absolute top-3 right-4 flex gap-2 text-gray-500">
          <button onClick={onMinimize} className="hover:text-gray-800" title="Minimize">
            –
          </button>
          <button onClick={handleEnd} className="hover:text-gray-800" title="End conversation">
            End
          </button>
        </div>
        <h2 className="text-lg font-semibold mb-3">Ask anything about your docs</h2>

        <textarea
          className="w-full border p-3 rounded-lg mb-4 text-black"
          rows={3}
          placeholder="Type your question..."
          value={question}
          onChange={e => setQuestion(e.target.value)}
        />

        <button onClick={handleAsk} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
          Ask
        </button>

        {messages.length > 0 && (
          <div className="mt-6 border-t pt-4 text-gray-800">
            <div className="text-sm font-bold mb-2">Conversation:</div>
            {messages.map((m, idx) => (
              <ChatBubble key={idx} message={m.text} type={m.sender} />
            ))}

            <SourceHint />
          </div>
        )}
      </div>
    </div>
  )
}
