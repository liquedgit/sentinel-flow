package proxy

import (
	"context"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"sync"
	"time"

	"sentinelflow/agent/internal/config"
	"sentinelflow/agent/internal/events"
	"sentinelflow/agent/internal/identity"
	"sentinelflow/agent/internal/sink"
)

// ReverseProxy is an http.Handler that forwards requests to a backend,
// resolves caller identity, and publishes enriched events to a message broker.
//
// Its backend URL, identity endpoint, and identity mapping can be updated
// at runtime (without restart) via ApplyRemoteConfig.
type ReverseProxy struct {
	sink sink.EventSink

	// mu guards all fields below – updated by ApplyRemoteConfig, read by
	// ServeHTTP and the per-request goroutines it spawns.
	mu               sync.RWMutex
	proxy            *httputil.ReverseProxy
	identityResolver identity.Resolver
}

// NewReverseProxy builds a ReverseProxy from bootstrap values.
// backendURL and meEndpoint are used until the first remote config arrives.
func NewReverseProxy(backendURL, meEndpoint string, s sink.EventSink) (*ReverseProxy, error) {
	rp := &ReverseProxy{sink: s}

	if err := rp.reconfigure(backendURL, meEndpoint, "GET", "user_id", "role", nil); err != nil {
		return nil, err
	}

	return rp, nil
}

// ApplyRemoteConfig hot-reloads the proxy with values from the Dashboard.
// It is safe to call concurrently from the poller goroutine.
func (rp *ReverseProxy) ApplyRemoteConfig(rc config.RemoteConfig) {
	log.Printf("[Proxy] Applying new Remote Configuration")

	// Extract identity field names from the mapping so the resolver knows
	// which claims to pull out of the identity endpoint response.
	userIDField, roleField := resolveFieldNames(rc.IdentityMapping)

	if err := rp.reconfigure(
		rc.BackendBaseURL,
		rc.IdentityEndpoint,
		"GET",
		userIDField,
		roleField,
		rc.IdentityMapping,
	); err != nil {
		log.Printf("[Proxy] Failed to apply remote config: %v", err)
		return
	}

	log.Printf("[Proxy] Now proxying to %s, identity at %s", rc.BackendBaseURL, rc.IdentityEndpoint)
}

// ServeHTTP implements http.Handler.
func (rp *ReverseProxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("X-Trace-ID") == "" {
		r.Header.Set("X-Trace-ID", generateTraceID())
	}

	log.Printf("[Agent] %s %s", r.Method, r.URL.Path)

	// Take a snapshot of the current proxy + resolver under a short read
	// lock so we don't hold it across the (potentially slow) backend call.
	rp.mu.RLock()
	p := rp.proxy
	resolver := rp.identityResolver
	rp.mu.RUnlock()

	// Attach the resolver to the request context so ModifyResponse can
	// use whichever resolver was active when the request arrived.
	ctx := context.WithValue(r.Context(), resolverKey{}, resolver)
	p.ServeHTTP(w, r.WithContext(ctx))
}

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

// reconfigure rebuilds the httputil.ReverseProxy and identity.Resolver under
// the write lock.  It is called both from NewReverseProxy and ApplyRemoteConfig.
func (rp *ReverseProxy) reconfigure(
	backendURL, identityEndpoint, method, userIDField, roleField string,
	mapping config.IdentityMapping,
) error {
	target, err := url.Parse(backendURL)
	if err != nil {
		return &configError{field: "backendURL", cause: err}
	}

	p := httputil.NewSingleHostReverseProxy(target)

	// Capture a local copy of the sink so the closure doesn't need to go
	// through the struct (avoids an extra lock per response).
	s := rp.sink

	p.ModifyResponse = func(resp *http.Response) error {
		r := resp.Request

		// Retrieve the resolver that was active when the request arrived.
		resolver, _ := r.Context().Value(resolverKey{}).(identity.Resolver)

		go func() {
			event := buildBaseEvent(r, resp)

			ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)
			defer cancel()

			if resolver != nil {
				id, err := resolver.Resolve(ctx, r)
				if err != nil {
					event.AuthPresent = false
					log.Printf("[Identity] resolve error: %v", err)
				} else {
					event.AuthPresent = true
					event.User = &events.UserRequestEvent{
						UserId: id.UserID,
						Role:   id.Role,
					}
					log.Printf("[Identity] user_id=%s role=%s", id.UserID, id.Role)
				}
			}

			if err := s.Publish(ctx, event); err != nil {
				log.Printf("[Sink] publish failed: %v", err)
			}
		}()

		return nil
	}

	// Build resolver – mapping may be nil during bootstrap (that's fine,
	// MeResolver falls back to its field-name arguments).
	resolver := identity.NewMeResolver(identityEndpoint, method, userIDField, roleField)
	if mapping != nil {
		resolver.WithMapping(toIdentityMapping(mapping))
	}

	rp.mu.Lock()
	rp.proxy = p
	rp.identityResolver = resolver
	rp.mu.Unlock()

	return nil
}

func toIdentityMapping(m config.IdentityMapping) identity.IdentityMapping {
	if m == nil {
		return nil
	}

	out := make(identity.IdentityMapping, len(m))
	for k, v := range m {
		raw, _ := json.Marshal(v.Default) // re-encode the json.RawMessage
		out[k] = identity.IdentityMappingField{
			Source:   v.Source,
			Path:     v.Path,
			Required: v.Required,
			Default:  raw,
		}
	}
	return out
}

// resolveFieldNames extracts the canonical "userId" and "role" JSON path
// names from the identity mapping, falling back to safe defaults.
func resolveFieldNames(mapping config.IdentityMapping) (userIDField, roleField string) {
	userIDField = "user_id"
	roleField = "role"

	if mapping == nil {
		return
	}

	// The mapping is keyed by the *application* name; look for well-known keys.
	for k, v := range mapping {
		switch k {
		case "userId", "user_id", "uid":
			userIDField = v.Path
		case "role", "roles":
			roleField = v.Path
		}
	}
	return
}

// resolverKey is the context key used to pass the identity resolver through
// the request lifecycle without a global variable.
type resolverKey struct{}

// configError wraps a reconfiguration error with the offending field name.
type configError struct {
	field string
	cause error
}

func (e *configError) Error() string {
	return "invalid " + e.field + ": " + e.cause.Error()
}

func (e *configError) Unwrap() error { return e.cause }

func generateTraceID() string {
	return time.Now().Format("20060102150405.000000000")
}

func extractClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}
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
