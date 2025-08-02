package ingest

// Chunk represents a document fragment after splitting.
type Chunk struct {
	DocID   string
	Content string
	Meta    map[string]any
}
