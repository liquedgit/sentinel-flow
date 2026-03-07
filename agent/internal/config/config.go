package config

import (
	"log"
	"os"
)

// Config holds the two values the agent needs to bootstrap itself.
// Everything else (backend URL, identity endpoint, identity mapping, …)
// is fetched from the Dashboard API on first start and re-fetched every
// 5 minutes via the Poller.
type Config struct {
	// AgentToken is the bearer token issued when the agent was registered
	// in the SentinelFlow Dashboard.  It authenticates every outbound API
	// call (initial config fetch + periodic polls + event ingest).
	AgentToken string

	// DashboardBaseURL is the base URL of the SentinelFlow Dashboard API,
	// e.g. "https://sentinel-flow.liqued.cloud".
	// Written to disk by install.sh; read once at startup.
	DashboardBaseURL string

	// ListenAddr is the address the reverse-proxy HTTP server binds to.
	// Default: ":8080"
	ListenAddr string
}

// Load reads the three bootstrap values from environment variables.
// These are the only env vars the agent ever reads; all other configuration
// comes from the Dashboard API.
//
// Environment variables
//
//	AGENT_TOKEN          – agent bearer token    (required)
//	DASHBOARD_BASE_URL   – dashboard API base URL (required)
//	AGENT_LISTEN_ADDR    – bind address           (default ":8080")
func Load() *Config {

	return &Config{
		AgentToken:       mustEnv("AGENT_TOKEN"),
		DashboardBaseURL: mustEnv("DASHBOARD_BASE_URL"),
		ListenAddr:       envOr("AGENT_LISTEN_ADDR", ":9000"),
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("[Config] Required environment variable %q is not set", key)
	}
	return v
}
