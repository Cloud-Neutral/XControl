'use client'

export function ChatBubble({ message, type }: { message: string; type: 'user' | 'ai' }) {
  const base = 'px-4 py-2 rounded-lg max-w-xs';
  const userStyle = 'bg-indigo-600 text-white self-end';
  const aiStyle = 'bg-gray-200 text-gray-800';

  return (
    <div className={`flex ${type === 'user' ? 'justify-end' : ''} mb-2`}>
      <div className={`${base} ${type === 'user' ? userStyle : aiStyle}`}>{message}</div>
    </div>
  );
}
