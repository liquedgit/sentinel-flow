package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/cache"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/config"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/consumer"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/detector"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/repository"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/scanner"
	"github.com/segmentio/kafka-go"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	cfg, err := config.Load()
	if err != nil {
		slog.Error("load config failed", "error", err)
		os.Exit(1)
	}
	if cfg.DatabaseURL == "" {
		slog.Error("DATABASE_URL is required")
		os.Exit(1)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("connect to database failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Initialize cache and load mappings from DB
	mappingCache := cache.New()
	mappingRepo := repository.NewMappingRepository(pool)
	mappings, err := mappingRepo.LoadActiveMappings(ctx)
	if err != nil {
		slog.Error("load mappings failed", "error", err)
		os.Exit(1)
	}
	mappingCache.Refresh(mappings)
	slog.Info("loaded mappings into cache", "count", len(mappings))

	// Repositories
	requestLogRepo := repository.NewRequestLogRepository(pool)
	violationRepo := repository.NewViolationRepository(pool)

	// Detector and Scanner
	det := detector.New(mappingCache)
	scan := scanner.New(pool, mappingRepo, mappingCache)

	// Kafka readers
	brokers := cfg.KafkaBrokersList()
	requestReader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  brokers,
		Topic:    cfg.KafkaTopicRequestLogs,
		GroupID:  cfg.KafkaGroupID,
		MinBytes: 1,
		MaxBytes: 10e6,
	})
	defer requestReader.Close()

	scanReader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  brokers,
		Topic:    cfg.KafkaTopicScanRequests,
		GroupID:  cfg.KafkaGroupID + "-scan",
		MinBytes: 1,
		MaxBytes: 10e6,
	})
	defer scanReader.Close()

	// Consumers
	requestConsumer := consumer.NewRequestConsumer(requestReader, requestLogRepo, violationRepo, det)
	scanConsumer := consumer.NewScanConsumer(scanReader, scan, scanner.ScanParams{
		LearningWindowDays:    cfg.LearningWindowDays,
		ViolationThresholdPct: cfg.ViolationThresholdPct,
		MinimumSampleSize:     cfg.MinimumSampleSize,
	})

	// Run consumers in goroutines
	errCh := make(chan error, 2)
	go func() {
		if err := requestConsumer.Run(ctx); err != nil && err != context.Canceled {
			errCh <- err
		}
	}()
	go func() {
		if err := scanConsumer.Run(ctx); err != nil && err != context.Canceled {
			errCh <- err
		}
	}()

	slog.Info("detection engine started", "request_topic", cfg.KafkaTopicRequestLogs, "scan_topic", cfg.KafkaTopicScanRequests)

	// Graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	select {
	case sig := <-sigCh:
		slog.Info("received signal, shutting down", "signal", sig)
		cancel()
	case err := <-errCh:
		slog.Error("consumer error", "error", err)
		cancel()
	}

	// Wait for consumers to drain (they'll exit when ctx is cancelled)
	<-ctx.Done()
	slog.Info("detection engine stopped")
}
