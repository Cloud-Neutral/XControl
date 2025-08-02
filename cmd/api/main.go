package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"xcontrol/internal/api"
	"xcontrol/server"
	markmind "xcontrol/server/markmind"
	"xcontrol/ui"
)

func main() {
	var conn *pgx.Conn
	if dsn := os.Getenv("KB_DSN"); dsn != "" {
		var err error
		conn, err = pgx.Connect(context.Background(), dsn)
		if err != nil {
			log.Printf("kb db connect error: %v", err)
		}
	}

	r := server.New(
		api.RegisterRoutes,
		func(r *gin.Engine) { markmind.RegisterRoutes(r, conn) },
		func(r *gin.Engine) { r.StaticFS("/", http.FS(ui.Assets)) },
	)

	r.Run() // listen and serve on 0.0.0.0:8080
}
