package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	rsync "xcontrol/internal/rag/sync"
)

// registerKnowledgeRoutes sets up knowledge base endpoints.
func registerKnowledgeRoutes(r *gin.RouterGroup, _ *pgx.Conn) {
	r.POST("/sync", func(c *gin.Context) {
		var req struct {
			RepoURL   string `json:"repo_url"`
			LocalPath string `json:"local_path"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if _, err := rsync.SyncRepo(c.Request.Context(), req.RepoURL, req.LocalPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "synced"})
	})
}
