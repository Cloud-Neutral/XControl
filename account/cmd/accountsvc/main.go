package main

import (
	"github.com/gin-gonic/gin"
	"xcontrol/account/api"
)

func main() {
	r := gin.Default()
	api.RegisterRoutes(r)
	r.Run()
}
