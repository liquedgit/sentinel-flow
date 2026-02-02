package sink

import (
	"context"
	"sentinelflow/agent/internal/events"
)

type EventSink interface {
	Publish(ctx context.Context, event events.RequestEvent) error
	Close() error
}
