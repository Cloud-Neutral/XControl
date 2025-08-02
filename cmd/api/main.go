package main

import (
	"context"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"xcontrol/server"
	"xcontrol/server/api"
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

	uiFS, err := fs.Sub(ui.Assets, "dist")
	if err != nil {
		log.Fatalf("ui assets: %v", err)
	}

	r := server.New(
		api.RegisterRoutes(conn),
		func(r *gin.Engine) {
			fileServer := http.FileServer(http.FS(uiFS))
			r.NoRoute(func(c *gin.Context) {
				if strings.HasPrefix(c.Request.URL.Path, "/api") {
					c.AbortWithStatus(http.StatusNotFound)
					return
				}
				fileServer.ServeHTTP(c.Writer, c.Request)
			})
		},
	)

	r.Run() // listen and serve on 0.0.0.0:8080
}
