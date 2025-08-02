package markmind

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"xcontrol/server/markmind/db"
	"xcontrol/server/markmind/ingest"
	"xcontrol/server/markmind/llm"
)

// answerFn is used to obtain an AI answer. It is replaceable in tests.
var answerFn = llm.Answer

// RegisterRoutes registers knowledge base endpoints.
func RegisterRoutes(r *gin.Engine, conn *pgx.Conn) {
	store := &db.Store{Conn: conn}
	r.POST("/api/sync", func(c *gin.Context) {
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

	r.POST("/api/askai", func(c *gin.Context) {
		var req struct {
			Question string `json:"question"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		answer, err := answerFn(c.Request.Context(), store, req.Question)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"answer": answer})
	})
}
