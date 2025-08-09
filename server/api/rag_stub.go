//go:build !legacy

package api

import (
	"context"
	"github.com/gin-gonic/gin"
)

type ragService interface {
	Sync(ctx context.Context) error
	Query(ctx context.Context, question string, limit int) (any, error)
}

var ragSvc ragService

func registerRAGRoutes(r *gin.RouterGroup) {}
