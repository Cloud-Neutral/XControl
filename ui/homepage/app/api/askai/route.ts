export async function POST(req: Request) {
  const { question } = await req.json()
  // TODO: integrate backend GPT/RAG service
  return Response.json({ answer: `Answer to: "${question}"\n\n👉 (this is a mock reply)` })
}
