package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"xcontrol/internal/rag"
	rconfig "xcontrol/internal/rag/config"
	"xcontrol/internal/rag/store"
	"xcontrol/server/proxy"
)

// ragSvc handles RAG document storage and retrieval.
var ragSvc = initRAG()

// initRAG attempts to construct a RAG service from server configuration.
func initRAG() *rag.Service {
	cfg, err := rconfig.LoadServer()
	if err != nil {
		return nil
	}
	proxy.Set(cfg.Proxy)
	return rag.New(cfg.ToConfig())
}

// registerRAGRoutes wires the /api/rag upsert and query endpoints.
func registerRAGRoutes(r *gin.RouterGroup) {
	r.POST("/rag/upsert", func(c *gin.Context) {
		if ragSvc == nil {
			c.JSON(http.StatusOK, gin.H{"rows": 0})
			return
		}
		var req struct {
			Docs []store.DocRow `json:"docs"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		n, err := ragSvc.Upsert(c.Request.Context(), req.Docs)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"rows": n})
	})

	r.POST("/rag/query", func(c *gin.Context) {
		var req struct {
			Question string `json:"question"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if ragSvc == nil {
			c.JSON(http.StatusOK, gin.H{"chunks": nil})
			return
		}
		docs, err := ragSvc.Query(c.Request.Context(), req.Question, 5)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"chunks": docs})
	})
}
