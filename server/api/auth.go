package api

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "xcontrol/server/internal/service"
)

type oidcRequest struct {
    Token string `json:"token"`
}

func registerAuthRoutes(r *gin.RouterGroup) {
    r.POST("/auth/oidc", oidcLogin)
}

func oidcLogin(c *gin.Context) {
    var req oidcRequest
    if err := c.ShouldBindJSON(&req); err != nil || req.Token == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "token required"})
        return
    }
    user, session, err := service.AuthenticateOIDC(c.Request.Context(), req.Token)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"user": user, "session": session})
}

