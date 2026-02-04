package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the detection engine.
type Config struct {
	DatabaseURL            string
	KafkaBrokers           string
	KafkaTopicRequestLogs  string
	KafkaTopicScanRequests string
	KafkaGroupID           string
	LearningWindowDays     int
	ViolationThresholdPct  float64
	MinimumSampleSize      int
}

// Load loads configuration from environment variables.
// Loads .env file if present (for local development).
func Load() (*Config, error) {
	_ = godotenv.Load()

	return &Config{
		DatabaseURL:            getEnv("DATABASE_URL", ""),
		KafkaBrokers:           getEnv("KAFKA_BROKERS", "localhost:9092"),
		KafkaTopicRequestLogs:  getEnv("KAFKA_TOPIC_REQUEST_LOGS", "request-logs"),
		KafkaTopicScanRequests: getEnv("KAFKA_TOPIC_SCAN_REQUESTS", "scan-requests"),
		KafkaGroupID:           getEnv("KAFKA_GROUP_ID", "detection-engine"),
		LearningWindowDays:     getEnvInt("LEARNING_WINDOW_DAYS", 90),
		ViolationThresholdPct:  getEnvFloat("VIOLATION_THRESHOLD_PERCENT", 5),
		MinimumSampleSize:      getEnvInt("MINIMUM_SAMPLE_SIZE", 100),
	}, nil
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return defaultVal
}

func getEnvFloat(key string, defaultVal float64) float64 {
	if v := os.Getenv(key); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
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
