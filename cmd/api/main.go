package main

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"xcontrol/internal/api"
	"xcontrol/ui"
)

func main() {
	r := gin.Default()
	api.RegisterRoutes(r)

	// serve embedded UI at root
	r.StaticFS("/", http.FS(ui.Assets))

	r.Run() // listen and serve on 0.0.0.0:8080
}
