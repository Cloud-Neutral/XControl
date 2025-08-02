package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"xcontrol/server/markmind/ingest"
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
		if err := ingest.CloneOrPullRepo(req.RepoURL, req.LocalPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "synced"})
	})
}
