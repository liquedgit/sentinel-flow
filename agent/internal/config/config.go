package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds agent configuration from environment variables.
type Config struct {
	BackendURL   string
	ListenAddr   string
	KafkaBrokers []string
	KafkaTopic   string
	MeEndpoint   string
}

// Load loads configuration from environment variables.
// Loads .env file if present (for local development).
func Load() *Config {
	_ = godotenv.Load()

	return &Config{
		BackendURL:   getEnv("BACKEND_URL", "http://localhost:8081"),
		ListenAddr:   getEnv("LISTEN_ADDR", ":9000"),
		KafkaBrokers: parseBrokers(getEnv("KAFKA_BROKERS", "localhost:9092")),
		KafkaTopic:   getEnv("KAFKA_TOPIC", "sf-events-access"),
		MeEndpoint:   getEnv("ME_ENDPOINT", "http://localhost:8081/me"),
	}
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func parseBrokers(s string) []string {
	if s == "" {
		return []string{"localhost:9092"}
	}
	parts := strings.Split(s, ",")
	for i, p := range parts {
		parts[i] = strings.TrimSpace(p)
	}
	return parts
}
