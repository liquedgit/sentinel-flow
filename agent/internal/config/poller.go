package config

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	PollInterval    = 5 * time.Minute
	pollHTTPTimeout = 15 * time.Second
)

type OnUpdateFunc func(cfg RemoteConfig)

type Poller struct {
	bootstrapCfg *Config
	httpClient   *http.Client

	mu        sync.RWMutex
	latest    *RemoteConfig
	callbacks []OnUpdateFunc
}

func NewPoller(bootstrapCfg *Config) *Poller {
	return &Poller{
		bootstrapCfg: bootstrapCfg,
		httpClient:   &http.Client{Timeout: pollHTTPTimeout},
	}
}

func (p *Poller) OnUpdate(fn OnUpdateFunc) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.callbacks = append(p.callbacks, fn)
}

func (p *Poller) Latest() *RemoteConfig {
	p.mu.RLock()
	defer p.mu.RUnlock()
	if p.latest == nil {
		return nil
	}
	cp := *p.latest
	return &cp
}

// FetchOnce performs a single blocking fetch and stores the result as the
// baseline for future change-detection.  Call this in main before starting
// the HTTP server so the agent never serves traffic without valid config.
func (p *Poller) FetchOnce(ctx context.Context) (RemoteConfig, error) {
	rc, err := p.fetchRemoteConfig(ctx)
	if err != nil {
		return RemoteConfig{}, fmt.Errorf("initial config fetch failed: %w", err)
	}

	p.mu.Lock()
	p.latest = rc
	p.mu.Unlock()

	log.Printf("[Poller] Initial config loaded (version=%s, backend=%q, identity=%q)",
		rc.Version, rc.BackendBaseURL, rc.IdentityEndpoint)

	return *rc, nil
}

// Run starts the background polling loop.  Ticks every PollInterval and fires
// OnUpdate callbacks when the config version changes.  Blocks until ctx is cancelled.
// Call FetchOnce before Run so the first tick diffs against a known baseline.
func (p *Poller) Run(ctx context.Context) {
	log.Printf("[Poller] Starting background poll every %s", PollInterval)

	ticker := time.NewTicker(PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[Poller] Stopping")
			return
		case <-ticker.C:
			p.fetchAndNotify(ctx)
		}
	}
}

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

func (p *Poller) fetchAndNotify(ctx context.Context) {
	rc, err := p.fetchRemoteConfig(ctx)
	if err != nil {
		log.Printf("[Poller] Poll failed: %v", err)
		return
	}

	p.mu.Lock()
	changed := p.latest == nil || rc.Version != p.latest.Version
	if changed {
		p.latest = rc
	}
	cbs := make([]OnUpdateFunc, len(p.callbacks))
	copy(cbs, p.callbacks)
	p.mu.Unlock()

	if !changed {
		log.Printf("[Poller] Config unchanged (version=%s)", rc.Version)
		return
	}

	log.Printf("[Poller] Config changed (version=%s, backend=%q, identity=%q)",
		rc.Version, rc.BackendBaseURL, rc.IdentityEndpoint)

	for _, fn := range cbs {
		fn := fn
		go fn(*rc)
	}
}

// fetchRemoteConfig calls GET {DashboardBaseURL}/api/agents/config,
// unwraps the { data: { agentIdentityEndpoint, agentBackendBaseUrl,
// agentIdentityMapping } } envelope, and returns a RemoteConfig.
func (p *Poller) fetchRemoteConfig(ctx context.Context) (*RemoteConfig, error) {
	url := strings.TrimRight(p.bootstrapCfg.DashboardBaseURL, "/") + "/api/agents/config"

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+p.bootstrapCfg.AgentToken)
	req.Header.Set("Accept", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("GET %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return nil, fmt.Errorf("dashboard returned HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var envelope dashboardConfigResponse
	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	if !envelope.Success {
		return nil, fmt.Errorf("dashboard returned success=false (status=%d)", envelope.Status)
	}

	d := envelope.Data
	if d.IdentityEndpoint == "" {
		return nil, fmt.Errorf("agentIdentityEndpoint missing from dashboard response")
	}
	if d.BackendBaseURL == "" {
		return nil, fmt.Errorf("agentBackendBaseUrl missing from dashboard response")
	}

	// agentIdentityMapping may arrive as an inline object or a JSON-encoded
	// string (double-encoded) depending on how the Dashboard stores it.
	mapping, err := parseIdentityMapping(d.IdentityMapping)
	if err != nil {
		return nil, fmt.Errorf("parse agentIdentityMapping: %w", err)
	}

	rc := &RemoteConfig{
		IdentityEndpoint: d.IdentityEndpoint,
		BackendBaseURL:   d.BackendBaseURL,
		IdentityMapping:  mapping,
		Version:          contentVersion(d.IdentityEndpoint, d.BackendBaseURL, mapping),
	}

	return rc, nil
}

// contentVersion produces a short hash from the three config fields so the
// poller can detect changes without the Dashboard sending an explicit version.
func contentVersion(identityEndpoint, backendBaseURL string, mapping IdentityMapping) string {
	h := sha256.New()
	h.Write([]byte(identityEndpoint))
	h.Write([]byte(backendBaseURL))
	if b, err := json.Marshal(mapping); err == nil {
		h.Write(b)
	}
	return fmt.Sprintf("%x", h.Sum(nil))[:12]
}
