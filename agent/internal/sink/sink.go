package sink

import (
	"context"
	"errors"

	"sentinelflow/agent/internal/events"
)

// EventSink is the interface every sink must satisfy.
type EventSink interface {
	Publish(ctx context.Context, event events.RequestEvent) error
	Close() error
}

// ErrQueueFull is returned by Publish when the internal buffer is full.
// Callers should log and continue – the agent never blocks traffic for sink backpressure.
var ErrQueueFull = errors.New("event queue full")
