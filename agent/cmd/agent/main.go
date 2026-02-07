package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"sentinelflow/agent/internal/config"
	"sentinelflow/agent/internal/proxy"
	"sentinelflow/agent/internal/sink"
)

func main() {
	cfg := config.Load()

	log.Println("[Agent] SentinelFlow Agent starting")

	kafkaSink := sink.NewKafkaSink(cfg.KafkaBrokers, cfg.KafkaTopic)
	defer kafkaSink.Close()

	handler, err := proxy.NewReverseProxy(cfg.BackendURL, cfg.MeEndpoint, kafkaSink)
	if err != nil {
		log.Fatalf("[Agent] Failed to create proxy: %v", err)
	}

	server := &http.Server{
		Addr:    cfg.ListenAddr,
		Handler: handler,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("[Agent] Listening on %s\n", cfg.ListenAddr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[Agent] Server error: %v", err)
		}
	}()

	<-stop
	log.Println("[Agent] Shutting down SentinelFlow Agent")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("[Agent] Shutdown error: %v", err)
	}

	log.Println("[Agent] Shutdown complete")
}
