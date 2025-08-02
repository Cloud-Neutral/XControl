package ingest

// Embed returns a placeholder embedding vector.
func Embed(text string) ([]float32, error) {
	vec := make([]float32, 1536)
	// TODO: integrate real embedding model
	return vec, nil
}
