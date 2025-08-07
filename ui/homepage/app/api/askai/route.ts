export async function POST(req: Request) {
  const { question, history } = await req.json()
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'
  const res = await fetch(`${apiBase}/api/askai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history })
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

