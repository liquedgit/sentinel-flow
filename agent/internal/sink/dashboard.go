package sink

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"sentinelflow/agent/internal/events"
)

// DashboardSink publishes intercepted request events to the SentinelFlow
// Dashboard API over HTTP.  The Dashboard is responsible for forwarding them
// to Kafka; the agent has no direct Kafka access.
//
//	POST {dashboardBaseURL}/api/v1/events
//	Authorization: Bearer {agentToken}
type DashboardSink struct {
	endpoint   string // fully-built URL, e.g. https://sentinel-flow.liqued.cloud/api/v1/events
	agentToken string
	client     *http.Client
	ch         chan events.RequestEvent
}

// NewDashboardSink constructs a DashboardSink and starts its background
// publish worker.  dashboardBaseURL should match DASHBOARD_BASE_URL from env.
func NewDashboardSink(agentToken, dashboardBaseURL string) *DashboardSink {
	s := &DashboardSink{
		endpoint:   strings.TrimRight(dashboardBaseURL, "/") + "/api/agents/events",
		agentToken: agentToken,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
		ch: make(chan events.RequestEvent, 1000),
	}

	go s.worker()

	return s
}

// Publish enqueues an event for async delivery.  It never blocks the caller —
// if the queue is full the event is dropped and ErrQueueFull is returned so
// the proxy can log it without stalling traffic.
func (s *DashboardSink) Publish(_ context.Context, event events.RequestEvent) error {
	select {
	case s.ch <- event:
		return nil
	default:
		return ErrQueueFull
	}
}

// Close drains the queue and shuts down the worker.
func (s *DashboardSink) Close() error {
	close(s.ch)
	return nil
}

// worker drains the event channel and POSTs each event to the Dashboard API.
func (s *DashboardSink) worker() {
	for event := range s.ch {
		if err := s.post(event); err != nil {
			log.Printf("[DashboardSink] publish error: %v", err)
		} else {
			log.Printf("[DashboardSink] event published (trace=%s)", event.TraceID)
		}
	}
}

// post serialises one event and sends it to the Dashboard API.
func (s *DashboardSink) post(event events.RequestEvent) error {
	payload, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.endpoint, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.agentToken)

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("POST %s: %w", s.endpoint, err)
	}
	defer resp.Body.Close()

	// Drain body so the connection can be reused
	_, _ = io.Copy(io.Discard, resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return fmt.Errorf("dashboard returned HTTP %d", resp.StatusCode)
	}

	return nil
}
