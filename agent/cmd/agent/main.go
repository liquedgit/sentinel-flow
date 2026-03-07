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
	// ── 1. Bootstrap ─────────────────────────────────────────────────────
	// Read only AGENT_TOKEN + DASHBOARD_BASE_URL + AGENT_LISTEN_ADDR from env.
	// Everything else comes from the Dashboard API.
	cfg := config.Load()

	log.Println("[Agent] SentinelFlow Agent starting")

	// ── 2. Fetch initial config from Dashboard ────────────────────────────
	// Block here until we have a valid config.  The agent cannot start
	// without knowing its backend URL, identity endpoint, and mapping.
	poller := config.NewPoller(cfg)

	initCtx, initCancel := context.WithTimeout(context.Background(), 30*time.Second)
	rc, err := poller.FetchOnce(initCtx)
	initCancel()
	if err != nil {
		log.Fatalf("[Agent] Could not fetch initial config from Dashboard: %v", err)
	}

	// ── 3. Event sink ─────────────────────────────────────────────────────
	// The sink pushes events to the Dashboard API which handles Kafka
	// internally – the agent has no direct Kafka access.
	eventSink := sink.NewDashboardSink(cfg.AgentToken, cfg.DashboardBaseURL)
	defer eventSink.Close()

	// ── 4. Reverse proxy (initialised from fresh config) ──────────────────
	handler, err := proxy.NewReverseProxy(rc.BackendBaseURL, rc.IdentityEndpoint, eventSink)
	if err != nil {
		log.Fatalf("[Agent] Failed to create proxy: %v", err)
	}
	handler.ApplyRemoteConfig(rc)

	// ── 5. Background config poller ───────────────────────────────────────
	// Re-fetches every 5 minutes and hot-reloads the proxy on change.
	poller.OnUpdate(func(updated config.RemoteConfig) {
		handler.ApplyRemoteConfig(updated)
	})

	pollCtx, pollCancel := context.WithCancel(context.Background())
	defer pollCancel()
	go poller.Run(pollCtx)

	// ── 6. HTTP server ────────────────────────────────────────────────────
	server := &http.Server{
		Addr:    cfg.ListenAddr,
		Handler: handler,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("[Agent] Listening on %s → backend %s", cfg.ListenAddr, rc.BackendBaseURL)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[Agent] Server error: %v", err)
		}
	}()

	// ── 7. Graceful shutdown ──────────────────────────────────────────────
	<-stop
	log.Println("[Agent] Shutting down")

	pollCancel()

	shutCtx, shutCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutCancel()

	if err := server.Shutdown(shutCtx); err != nil {
		log.Printf("[Agent] Shutdown error: %v", err)
	}

	log.Println("[Agent] Shutdown complete")
}
