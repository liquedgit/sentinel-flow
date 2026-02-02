package sink

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"sentinelflow/agent/internal/events"
	"time"

	"github.com/segmentio/kafka-go"
)

var ErrQueueFull = errors.New("event queue full")

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
			msg := kafka.Message{
				Key:   []byte(key),
				Value: payload,
			}
			err = sink.writer.WriteMessages(ctx, msg)

			cancel()

			if err != nil {
				log.Println("[Kafka] write error:", err)
			} else {
				log.Printf(
					"[Kafka] write success",
				)
			}
		}
	}()

	return sink
}

func (k *KafkaSink) Publish(ctx context.Context, event events.RequestEvent) error {
	select {
	case <-ctx.Done():
		return ctx.Err()

	case k.ch <- event:
		return nil

	default:
		return ErrQueueFull // fail-open, never block traffic
	}
}

func (k *KafkaSink) Close() error {
	close(k.ch)
	return k.writer.Close()
}
