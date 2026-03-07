package sink

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/segmentio/kafka-go"

	"sentinelflow/agent/internal/events"
)

// KafkaSink is kept for internal Dashboard-side use.
// The agent itself uses DashboardSink and never connects to Kafka directly.
type KafkaSink struct {
	writer *kafka.Writer
	ch     chan events.RequestEvent
}

func NewKafkaSink(brokers []string, topic string) *KafkaSink {
	writer := &kafka.Writer{
		Addr:     kafka.TCP(brokers...),
		Topic:    topic,
		Balancer: &kafka.LeastBytes{},
	}

	sink := &KafkaSink{
		writer: writer,
		ch:     make(chan events.RequestEvent, 1000),
	}

	go func() {
		for event := range sink.ch {
			payload, err := json.Marshal(event)
			if err != nil {
				log.Println("[Kafka] marshal error:", err)
				continue
			}

			var key string
			if event.User != nil {
				key = event.User.UserId + " | " + event.User.Role + " | "
			}
			key += event.TraceID

			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			err = sink.writer.WriteMessages(ctx, kafka.Message{
				Key:   []byte(key),
				Value: payload,
			})
			cancel()

			if err != nil {
				log.Println("[Kafka] write error:", err)
			} else {
				log.Println("[Kafka] write success")
			}
		}
	}()

	return sink
}

func (k *KafkaSink) Publish(_ context.Context, event events.RequestEvent) error {
	select {
	case k.ch <- event:
		return nil
	default:
		return ErrQueueFull
	}
}

func (k *KafkaSink) Close() error {
	close(k.ch)
	return k.writer.Close()
}
