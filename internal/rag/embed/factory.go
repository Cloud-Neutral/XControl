package embed

import "strings"

// NewClient creates an embeddings client based on provider or base URL.
func NewClient(provider, baseURL, token, model string) Client {
	p := strings.ToLower(provider)
	if p == "" {
		if strings.Contains(strings.ToLower(baseURL), "chutes") {
			p = "chutes"
		} else if strings.Contains(strings.ToLower(baseURL), "ollama") {
			p = "ollama"
		} else {
			p = "openai"
		}
	}
	endpoint := strings.TrimRight(baseURL, "/")
	switch p {
	case "chutes":
		if !strings.HasSuffix(endpoint, "/embed") {
			endpoint += "/embed"
		}
		return NewChutesClient(endpoint, token, model)
	case "ollama":
		return NewOllamaClient(endpoint, model)
	default:
		if !strings.HasSuffix(endpoint, "/v1/embeddings") {
			endpoint += "/v1/embeddings"
		}
		return NewOpenAIClient(endpoint, token, model)
	}
}
