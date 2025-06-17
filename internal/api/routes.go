package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"xcontrol/internal/service"
)

func RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		api.GET("/users", getUsers)
		api.GET("/nodes", getNodes)
	}
}

func getUsers(c *gin.Context) {
	users, err := service.ListUsers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
}

func getNodes(c *gin.Context) {
	nodes, err := service.ListNodes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, nodes)
}
