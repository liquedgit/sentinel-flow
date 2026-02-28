package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/liquedgit/sentinel-flow/ai-agent-checker/internal/config"
	"github.com/liquedgit/sentinel-flow/ai-agent-checker/internal/consumer"
	"github.com/liquedgit/sentinel-flow/ai-agent-checker/internal/runner"
	"github.com/liquedgit/sentinel-flow/ai-agent-checker/internal/validator"
	"github.com/segmentio/kafka-go"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	cfg, err := config.Load()
	if err != nil {
		slog.Error("load config failed", "error", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	projValidator := validator.New(cfg.ProjectsDir)
	agentRunner := runner.New(cfg.PromptFile, cfg.AgentCmd)

	brokers := cfg.KafkaBrokersList()
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  brokers,
		Topic:    cfg.KafkaTopicCheckRequests,
		GroupID:  cfg.KafkaGroupID,
		MinBytes: 1,
		MaxBytes: 10e6,
	})
	defer reader.Close()

	checkConsumer := consumer.NewCheckConsumer(reader, projValidator, agentRunner)

	go func() {
		if err := checkConsumer.Run(ctx); err != nil && err != context.Canceled {
			slog.Error("check consumer error", "error", err)
		}
	}()

	slog.Info("agent-checker started", "topic", cfg.KafkaTopicCheckRequests, "projects_dir", cfg.ProjectsDir)

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh
	slog.Info("received signal, shutting down")
	cancel()
}
