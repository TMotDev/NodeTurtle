package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"NodeTurtleAPI/internal/api"
	"NodeTurtleAPI/internal/config"
	"NodeTurtleAPI/internal/database"
)

func main() {
	// Define flags for configuration
	configPath := flag.String("config", "", "Path to config file")
	envFile := flag.String("env", ".env", "Path to .env file")
	flag.Parse()

	// Load configuration
	cfg, err := config.Load(*configPath, *envFile)
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Connect to database
	db, err := database.Connect(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Start the API server
	server := api.NewServer(cfg, db)
	go func() {
		if err := server.Start(); err != nil {
			log.Printf("Server shutdown: %v", err)
		}
	}()

	// Wait for termination signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	// Graceful shutdown
	if err := server.Shutdown(); err != nil {
		log.Fatalf("Server shutdown failed: %v", err)
	}
}
