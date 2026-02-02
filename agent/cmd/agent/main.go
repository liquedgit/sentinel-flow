package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"sentinelflow/agent/internal/proxy"
	"sentinelflow/agent/internal/sink"
)

func main() {
	// TODO: Change backend url to be polling config of the Agent from the Web agent settings
	backendURL := "http://localhost:8081"
	listenAddr := ":9000"

	log.Println("[Agent] SentinelFlow Agent starting")

	// Initializing Kafka Sink
	// TODO: Please remove the hardcoded Kafka URL
	kafkaSink := sink.NewKafkaSink(
		[]string{"localhost:9092"},
		"sf-events-access",
	)
	defer kafkaSink.Close()

	// Initializing Reverse Proxy
	handler, err := proxy.NewReverseProxy(backendURL, kafkaSink)
	if err != nil {
		log.Fatalf("[Agent] Failed to create proxy: %v", err)
	}

	server := &http.Server{
		Addr:    listenAddr,
		Handler: handler,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("[Agent] Listening on %s\n", listenAddr)
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
