export async function fetchRelatedDocs(query: string): Promise<string[]> {
  // TODO: integrate actual knowledge base search
  console.warn('fetchRelatedDocs is using a mock implementation')
  return Promise.resolve([])
}
