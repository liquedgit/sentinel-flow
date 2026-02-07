package proxy

import (
	"context"
	"errors"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"sentinelflow/agent/internal/events"
	"sentinelflow/agent/internal/identity"
	"sentinelflow/agent/internal/sink"
)

func NewReverseProxy(backendURL, meEndpoint string, sink sink.EventSink) (http.Handler, error) {
	identityResolver := identity.NewMeResolver(meEndpoint, "GET", "user_id", "role")
	target, err := url.Parse(backendURL)
	if err != nil {
		return nil, errors.New("invalid backend URL")
	}

	proxy := httputil.NewSingleHostReverseProxy(target)

	// After actual backend handled the request, the agent will get user details with provided auth context and will send the enriched information to the Message Broken for later to be detected by the Detection Service
	proxy.ModifyResponse = func(resp *http.Response) error {
		r := resp.Request

		// Fire-and-forget identity resolution
		go func() {
			event := buildBaseEvent(r, resp)

			ctx, cancel := context.WithTimeout(
				context.Background(),
				300*time.Millisecond,
			)
			defer cancel()

			identity, err := identityResolver.Resolve(ctx, r)
			if err != nil {
				event.AuthPresent = false
			} else {
				event.AuthPresent = true
				event.User = &events.UserRequestEvent{
					UserId: identity.UserID,
					Role:   identity.Role,
				}
				log.Printf(
					"[Identity] user_id=%s role=%s",
					identity.UserID,
					identity.Role,
				)
			}

			// Send Event to the Message Broker
			if err := sink.Publish(ctx, event); err != nil {
				log.Printf("[Sink] publish failed: %v", err)
			}
		}()

		return nil
	}

	// Wrap proxy to intercept requests
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Ensure trace ID exists
		if r.Header.Get("X-Trace-ID") == "" {
			r.Header.Set("X-Trace-ID", generateTraceID())
		}

		log.Printf("[Agent] %s %s\n", r.Method, r.URL.Path)

		// Forward request to backend
		proxy.ServeHTTP(w, r)
	}), nil
}

func generateTraceID() string {
	return time.Now().Format("20060102150405.000000000")
}

func extractClientIP(r *http.Request) string {
	// Check X-Forwarded-For first
	// TODO: For Development only please remove on production
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}

	// Fallback to RemoteAddr
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func buildBaseEvent(req *http.Request, resp *http.Response) events.RequestEvent {
	return events.RequestEvent{
		TraceID:   req.Header.Get("X-Trace-ID"),
		Method:    req.Method,
		Path:      req.URL.Path,
		Query:     req.URL.RawQuery,
		ClientIP:  extractClientIP(req),
		Status:    resp.StatusCode,
		Timestamp: time.Now(),
	}
}
