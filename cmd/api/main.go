package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"xcontrol/internal/api"
	kbserver "xcontrol/modules/markmind/server"
	"xcontrol/ui"
)

func main() {
	r := gin.Default()

	var conn *pgx.Conn
	if dsn := os.Getenv("KB_DSN"); dsn != "" {
		var err error
		conn, err = pgx.Connect(context.Background(), dsn)
		if err != nil {
			log.Printf("kb db connect error: %v", err)
		}
	}

	api.RegisterRoutes(r)
	kbserver.RegisterRoutes(r, conn)

	// serve embedded UI at root
	r.StaticFS("/", http.FS(ui.Assets))

	r.Run() // listen and serve on 0.0.0.0:8080
}
