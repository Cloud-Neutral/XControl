package api

import "github.com/gin-gonic/gin"

// RegisterRoutes attaches account service endpoints to the router.
func RegisterRoutes(r *gin.Engine) {
	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
}
