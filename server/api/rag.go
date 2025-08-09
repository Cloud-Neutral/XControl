package api

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"xcontrol/server/proxy"
	"xcontrol/server/rag"
	rconfig "xcontrol/server/rag/config"
)

// ragSvc provides repository sync and retrieval operations.
var ragSvc = initRAG()

// initRAG attempts to construct a RAG service from server configuration.
func initRAG() *rag.Service {
	cfg, err := rconfig.LoadServer()
	if err != nil {
		return nil
	}
	proxy.Set(cfg.Proxy)
	svc := rag.New(cfg.ToConfig())
	go svc.Sync(context.Background())
	go svc.Watch(context.Background())
	return svc
}

// registerRAGRoutes wires the /api/rag endpoints.
func registerRAGRoutes(r *gin.RouterGroup) {
	r.POST("/rag/sync", func(c *gin.Context) {
		if ragSvc == nil {
			c.String(http.StatusOK, "rag service not initialized\n")
			return
		}
		c.Writer.Header().Set("Content-Type", "text/plain; charset=utf-8")
		c.Status(http.StatusOK)
		err := ragSvc.SyncWithProgress(c.Request.Context(), func(msg string) {
			_, _ = c.Writer.Write([]byte(msg + "\n"))
			c.Writer.Flush()
		})
		if err != nil {
			_, _ = c.Writer.Write([]byte("error: " + err.Error() + "\n"))
			return
		}
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
