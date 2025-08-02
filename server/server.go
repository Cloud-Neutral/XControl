package server

import (
	"runtime"

	"github.com/gin-gonic/gin"
)

// Registrar registers routes on the provided gin engine.
type Registrar func(*gin.Engine)

// New creates a gin engine with all CPU cores enabled and applies the provided route registrars.
func New(registrars ...Registrar) *gin.Engine {
	runtime.GOMAXPROCS(runtime.NumCPU())
	r := gin.Default()
	for _, register := range registrars {
		if register != nil {
			register(r)
		}
	}
	return r
}
