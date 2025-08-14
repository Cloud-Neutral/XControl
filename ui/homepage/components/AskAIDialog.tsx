'use client'

import { useRef, useState } from 'react'
import { ChatBubble } from './ChatBubble'
import { SourceHint } from './SourceHint'

const MAX_MESSAGES = 20

export function AskAIDialog({
  open,
  apiBase,
  onMinimize,
  onEnd
}: {
  open: boolean
  apiBase: string
  onMinimize: () => void
  onEnd: () => void
}) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([])
  const [sources, setSources] = useState<any[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const cacheRef = useRef(
    new Map<string, { answer: string; sources: any[]; timestamp: number }>()
  )
  const requestIdRef = useRef(0)

  function normalizeInput(text: string) {
    return text
      .trim()
      .replace(/[\s.,!?;:，。！？；：]+$/u, '')
      .replace(/```[\s\S]*?```/g, '')
  }

  function renderMarkdown(text: string) {
    // code blocks
    let html = text.replace(
      /```([\s\S]*?)```/g,
      (_, code) =>
        `<pre class="bg-gray-100 p-2 rounded overflow-x-auto"><code>${code
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</code></pre>`
    )

    // inline code
    html = html.replace(
      /`([^`]+)`/g,
      (_, code) =>
        `<code class="bg-gray-100 rounded px-1">${code
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</code>`
    )

    // headings
    html = html
      .replace(/^###### (.*)$/gm, '<h6 class="font-semibold">$1</h6>')
      .replace(/^##### (.*)$/gm, '<h5 class="font-semibold">$1</h5>')
      .replace(/^#### (.*)$/gm, '<h4 class="font-semibold">$1</h4>')
      .replace(/^### (.*)$/gm, '<h3 class="font-semibold">$1</h3>')
      .replace(/^## (.*)$/gm, '<h2 class="font-semibold">$1</h2>')
      .replace(/^# (.*)$/gm, '<h1 class="font-semibold">$1</h1>')

    // bold & italics
    html = html
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')

    // links
    html = html.replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>'
    )

    // blockquotes
    html = html.replace(
      /^> (.*)$/gm,
      '<blockquote class="border-l-4 pl-4 italic text-gray-600">$1</blockquote>'
    )

    // unordered lists
    html = html.replace(/^(?:[-+*] .*(?:\n|$))+?/gm, match => {
      const items = match
        .trim()
        .split('\n')
        .map(line => line.replace(/^[-+*] /, '').trim())
      return `<ul class="list-disc pl-5 space-y-1">${items
        .map(item => `<li>${item}</li>`)
        .join('')}</ul>`
    })

    // ordered lists
    html = html.replace(/^(?:\d+\. .*(?:\n|$))+?/gm, match => {
      const items = match
        .trim()
        .split('\n')
        .map(line => line.replace(/^\d+\. /, '').trim())
      return `<ol class="list-decimal pl-5 space-y-1">${items
        .map(item => `<li>${item}</li>`)
        .join('')}</ol>`
    })

    // line breaks
    return html.replace(/\n+/g, '<br />')
  }

  async function streamChat(
    url: string,
    body: any,
    update: (text: string, src?: any[]) => void
  ) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    })

    if (!res.ok) throw new Error('Request failed')

    const reader = res.body?.getReader()
    if (!reader) throw new Error('No reader')

    const decoder = new TextDecoder()
    let buffer = ''
    let answer = ''
    let retrieved: any[] = []

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() || ''

      for (const part of parts) {
        const line = part.split('\n').find(l => l.startsWith('data:'))
        if (!line) {
          answer += part
          update(answer, retrieved)
          continue
        }
        const dataStr = line.replace(/^data: ?/, '').trim()
        if (dataStr === '[DONE]') continue
        try {
          const json = JSON.parse(dataStr)
          if (json.answer) answer += json.answer
          else if (typeof json === 'string') answer += json
          if (json.chunks) retrieved = json.chunks
          if (json.sources) retrieved = json.sources
        } catch {
          answer += dataStr
        }
        update(answer, retrieved)
      }
    }

    update(answer, retrieved)
    if (abortRef.current === controller) abortRef.current = null
    return { answer, retrieved }
  }

  async function performAsk() {
    const normalized = normalizeInput(question)
    if (!normalized) return
    const now = Date.now()
    const cached = cacheRef.current.get(normalized)
    if (cached && now - cached.timestamp < 10000) {
      const userMessage = {
        sender: 'user' as const,
        text: renderMarkdown(normalized)
      }
      const aiMessage = {
        sender: 'ai' as const,
        text: renderMarkdown(cached.answer)
      }
      setMessages(prev => [...prev, userMessage, aiMessage].slice(-MAX_MESSAGES))
      setSources(cached.sources)
      setQuestion('')
      return
    }

    const id = ++requestIdRef.current
    const userMessage = {
      sender: 'user' as const,
      text: renderMarkdown(normalized)
    }
    const history = [...messages.slice(-MAX_MESSAGES + 1), userMessage]
    setMessages(prev => [...prev, userMessage, { sender: 'ai', text: '' }])
    setQuestion('')

    const updateAI = (text: string, src?: any[]) => {
      if (id !== requestIdRef.current) return
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { sender: 'ai', text: renderMarkdown(text) }
        return next
      })
      if (src) setSources(src)
    }

    try {
      let { answer, retrieved } = await streamChat(
        `${apiBase}/api/rag/query`,
        { question: normalized, history },
        updateAI
      )

      if (!answer || retrieved.length === 0) {
        try {
          const result = await streamChat(
            `${apiBase}/api/askai`,
            { question: normalized, history },
            updateAI
          )
          if (result.answer) {
            answer = result.answer
          }
          if (result.retrieved && result.retrieved.length > 0) {
            retrieved = result.retrieved
          }
        } catch {
          // ignore, fallback handled below
        }

        if (!answer) {
          answer = 'Sorry, I could not find an answer at this time.'
          updateAI(answer)
        } else if (retrieved.length === 0) {
          answer +=
            '\n\n_Note: No relevant documents were found; this answer may be inaccurate._'
          updateAI(answer)
        }
      }

      cacheRef.current.set(normalized, {
        answer,
        sources: retrieved,
        timestamp: now
      })
    } catch (err) {
      if (id !== requestIdRef.current) return
      updateAI('Something went wrong. Please try again later.')
    }
  }

  function handleAsk() {
    abortRef.current?.abort()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(performAsk, 300)
  }

  function handleEnd() {
    setMessages([])
    setQuestion('')
    setSources([])
    onEnd()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="hidden md:block flex-1 bg-black/40" onClick={onMinimize} />
      <div className="w-full md:w-1/2 h-full bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Ask anything about your docs</h2>
          <div className="flex gap-2 text-gray-500">
            <button onClick={onMinimize} className="hover:text-gray-800" title="Minimize">
              –
            </button>
            <button onClick={handleEnd} className="hover:text-gray-800" title="End conversation">
              End
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 text-gray-800 space-y-4">
          {messages.map((m, idx) => (
            <ChatBubble key={idx} message={m.text} type={m.sender} />
          ))}
          {sources.length > 0 && <SourceHint sources={sources} />}
        </div>

        <div className="border-t p-4">
          <textarea
            className="w-full border p-3 rounded-lg mb-4 text-black"
            rows={3}
            placeholder="Type your question..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleAsk()
              }
            }}
          />
          <button
            onClick={handleAsk}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  )
}
