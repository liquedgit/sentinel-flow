package config

import (
	"encoding/json"
	"fmt"
)

// IdentityMappingField describes how a single attribute is extracted from the
// identity endpoint response.
type IdentityMappingField struct {
	Source   string          `json:"source"`
	Path     string          `json:"path"`
	Required bool            `json:"required"`
	Default  json.RawMessage `json:"default,omitempty"`
}

// IdentityMapping is keyed by the canonical attribute name (e.g. "userId", "role").
type IdentityMapping map[string]IdentityMappingField

type dashboardConfigResponse struct {
	Data struct {
		IdentityEndpoint string          `json:"identityEndpoint"`
		BackendBaseURL   string          `json:"backendBaseUrl"`
		IdentityMapping  json.RawMessage `json:"identityMapping"`
	} `json:"data"`
	Status  int  `json:"status"`
	Success bool `json:"success"`
}

// RemoteConfig is the normalised config the rest of the agent works with
// after unwrapping the Dashboard response envelope.
type RemoteConfig struct {
	IdentityEndpoint string
	BackendBaseURL   string
	IdentityMapping  IdentityMapping

	// Version is a short content-hash used only for change-detection.
	Version string
}

func parseIdentityMapping(raw json.RawMessage) (IdentityMapping, error) {
	if len(raw) == 0 {
		return nil, nil
	}

	// Case 1: raw bytes start with '{' → it is an inline JSON object.
	if raw[0] == '{' {
		var m IdentityMapping
		if err := json.Unmarshal(raw, &m); err != nil {
			return nil, fmt.Errorf("unmarshal identity mapping object: %w", err)
		}
		return m, nil
	}

	// Case 2: raw bytes start with '"' → it is a JSON-encoded string.
	// First decode the outer string, then decode the inner JSON.
	var encoded string
	if err := json.Unmarshal(raw, &encoded); err != nil {
		return nil, fmt.Errorf("unmarshal identity mapping string wrapper: %w", err)
	}

	var m IdentityMapping
	if err := json.Unmarshal([]byte(encoded), &m); err != nil {
		return nil, fmt.Errorf("unmarshal identity mapping inner json: %w", err)
	}

	return m, nil
}
