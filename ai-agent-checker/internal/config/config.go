package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the agent-checker.
type Config struct {
	DatabaseURL            string
	KafkaBrokers           string
	KafkaTopicCheckRequests string
	KafkaGroupID           string
	ProjectsDir            string
	PromptFile             string
	AgentCmd               string
}

// Load loads configuration from environment variables.
// Loads .env file if present (for local development).
func Load() (*Config, error) {
	_ = godotenv.Load()

	return &Config{
		DatabaseURL:            getEnv("DATABASE_URL", ""),
		KafkaBrokers:           getEnv("KAFKA_BROKERS", "localhost:9092"),
		KafkaTopicCheckRequests: getEnv("KAFKA_TOPIC_CHECK_REQUESTS", "sf-check-requests"),
		KafkaGroupID:           getEnv("KAFKA_GROUP_ID", "agent-checker"),
		ProjectsDir:            getEnv("PROJECTS_DIR", "/app/projects"),
		PromptFile:             getEnv("PROMPT_FILE", "/app/prompt.dat"),
		AgentCmd:               getEnv("AGENT_CMD", "opencode"),
	}, nil
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

// KafkaBrokersList returns Kafka brokers as a slice (comma-separated).
func (c *Config) KafkaBrokersList() []string {
	if c.KafkaBrokers == "" {
		return []string{"localhost:9092"}
	}
	parts := strings.Split(c.KafkaBrokers, ",")
	for i, p := range parts {
		parts[i] = strings.TrimSpace(p)
	}
	return parts
}
