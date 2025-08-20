'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithOIDC } from '@lib/api/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | undefined>()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await loginWithOIDC(token)
      router.push('/panel/account')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Register</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-2 max-w-sm">
        <input
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="OIDC Token"
          className="border p-2"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" className="bg-blue-500 text-white p-2">Register</button>
      </form>
    </div>
  )
}
