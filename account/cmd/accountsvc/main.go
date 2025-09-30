package main

import (
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/spf13/cobra"

	"xcontrol/account/api"
	"xcontrol/account/config"
)

var (
	configPath string
	logLevel   string
)

var rootCmd = &cobra.Command{
	Use:   "xcontrol-account",
	Short: "Start the xcontrol account service",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := config.Load(configPath)
		if err != nil {
			return err
		}
		if logLevel != "" {
			cfg.Log.Level = logLevel
		}

		level := slog.LevelInfo
		switch strings.ToLower(strings.TrimSpace(cfg.Log.Level)) {
		case "debug":
			level = slog.LevelDebug
		case "warn", "warning":
			level = slog.LevelWarn
		case "error":
			level = slog.LevelError
		}

		logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: level}))
		slog.SetDefault(logger)

		r := gin.New()
		r.Use(gin.Recovery())
		r.Use(func(c *gin.Context) {
			start := time.Now()
			c.Next()
			logger.Info("request", "method", c.Request.Method, "path", c.FullPath(), "status", c.Writer.Status(), "latency", time.Since(start))
		})

		api.RegisterRoutes(r)

		logger.Info("starting account service", "addr", ":8080")
		if err := r.Run(); err != nil {
			logger.Error("account service shutdown", "err", err)
			return err
		}
		return nil
	},
}

func init() {
	rootCmd.Flags().StringVar(&configPath, "config", "", "path to xcontrol account configuration file")
	rootCmd.Flags().StringVar(&logLevel, "log-level", "info", "log level (debug, info, warn, error)")
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
