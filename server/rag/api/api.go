package api

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"xcontrol/server/rag/config"
	"xcontrol/server/rag/embed"
	"xcontrol/server/rag/ingest"
	"xcontrol/server/rag/store"
	rsync "xcontrol/server/rag/sync"
)

// Register mounts RAG routes on the gin engine.
func Register(r *gin.Engine, cfg *config.Config, st *store.Store, emb embed.Embedder) {
	r.POST("/rag/sync", func(c *gin.Context) {
		for _, repo := range cfg.Repos {
			files, err := rsync.Repo(repo)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			for _, f := range files {
				docs, err := ingest.File(repo.URL, f)
				if err != nil {
					continue
				}
				for i := range docs {
					vec, err := emb.Embed(c.Request.Context(), docs[i].Content)
					if err != nil {
						continue
					}
					docs[i].Embedding = vec
				}
				st.Upsert(context.Background(), docs)
			}
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.POST("/rag/query", func(c *gin.Context) {
		var req struct {
			Question string `json:"question"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		vec, err := emb.Embed(c.Request.Context(), req.Question)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		docs, err := st.Search(c.Request.Context(), vec, 5)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"chunks": docs})
	})
}
