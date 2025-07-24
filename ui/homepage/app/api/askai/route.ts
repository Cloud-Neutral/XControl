export async function POST(req: Request) {
  const { question, history } = await req.json()
  // TODO: integrate backend GPT/RAG service and knowledge base using history
  return Response.json({
    answer: `Answer to: "${question}"\n\n👉 (this is a mock reply)`,
  })
}

