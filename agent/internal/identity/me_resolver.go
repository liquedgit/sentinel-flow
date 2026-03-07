package identity

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// IdentityMappingField describes how a single attribute is extracted from the
// identity endpoint response.
type IdentityMappingField struct {
	Source   string          `json:"source"`
	Path     string          `json:"path"`
	Required bool            `json:"required"`
	Default  json.RawMessage `json:"default,omitempty"`
}

// IdentityMapping is keyed by the canonical attribute name your application
// uses (e.g. "userId", "role", "permissions").
type IdentityMapping map[string]IdentityMappingField

// MeResolver calls an identity endpoint to resolve the caller's identity.
// When a mapping is attached via WithMapping, field values are extracted using
// dot-separated paths (e.g. "data.user.id") instead of flat key names.
type MeResolver struct {
	Endpoint    string
	Method      string
	UserIDField string
	RoleField   string
	Client      *http.Client

	// mapping is nil until WithMapping is called; nil falls back to the
	// original flat UserIDField / RoleField behaviour.
	mapping IdentityMapping
}

func NewMeResolver(endpoint, method, userIDField, roleField string) *MeResolver {
	return &MeResolver{
		Endpoint:    endpoint,
		Method:      method,
		UserIDField: userIDField,
		RoleField:   roleField,
		Client: &http.Client{
			Timeout: 100 * time.Millisecond,
		},
	}
}

// WithMapping attaches an IdentityMapping to the resolver. When set, Resolve
// uses dot-path extraction for every declared field instead of the flat
// UserIDField / RoleField names. Returns the receiver for chaining.
func (r *MeResolver) WithMapping(m IdentityMapping) *MeResolver {
	r.mapping = m
	return r
}

func (r *MeResolver) Resolve(ctx context.Context, req *http.Request) (*Identity, error) {
	// Fast path: headers already carry identity (e.g. set by an upstream gateway).
	if userID := req.Header.Get("X-User-Id"); userID != "" {
		role := req.Header.Get("X-Role")
		return &Identity{UserID: userID, Role: role}, nil
	}

	body, err := r.fetchIdentity(ctx, req)
	if err != nil {
		return nil, err
	}

	if r.mapping != nil {
		return r.extractWithMapping(body)
	}
	return r.extractFlat(body)
}

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

// fetchIdentity performs the outbound call to the identity endpoint and
// returns the decoded JSON body.
func (r *MeResolver) fetchIdentity(ctx context.Context, req *http.Request) (map[string]interface{}, error) {
	meReq, err := http.NewRequestWithContext(ctx, r.Method, r.Endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("build identity request: %w", err)
	}

	// Forward the original auth context (Authorization, Cookie, …).
	meReq.Header = req.Header.Clone()

	resp, err := r.Client.Do(meReq)
	if err != nil {
		return nil, fmt.Errorf("identity endpoint unreachable: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("identity endpoint returned HTTP %d", resp.StatusCode)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("decode identity response: %w", err)
	}

	return body, nil
}

// extractWithMapping uses the IdentityMapping to pull values out of body via
// dot-separated paths, then assembles an Identity.
//
// Given a mapping like:
//
//	"userId":      { "path": "data.user.id",   "required": true  }
//	"role":        { "path": "data.user.role",  "required": true  }
//	"permissions": { "path": "data.user.perms", "default":  []    }
//
// and a response body { "data": { "user": { "id": "u1", "role": "admin" } } }
// it will return Identity{UserID:"u1", Role:"admin"}.
func (r *MeResolver) extractWithMapping(body map[string]interface{}) (*Identity, error) {
	extracted := make(map[string]interface{}, len(r.mapping))

	for fieldName, rule := range r.mapping {
		val, found := dotGet(body, rule.Path)

		if !found || val == nil {
			if rule.Required {
				return nil, fmt.Errorf("required identity field %q (path %q) missing from response", fieldName, rule.Path)
			}
			// Apply the declared default when the field is absent.
			if rule.Default != nil {
				var def interface{}
				_ = json.Unmarshal(rule.Default, &def)
				extracted[fieldName] = def
			}
			continue
		}

		extracted[fieldName] = val
	}

	userID := firstString(extracted, "userId", "user_id", "uid")
	if userID == "" {
		return nil, errors.New("identity mapping did not yield a user id")
	}

	role := firstString(extracted, "role", "roles")

	// Anything beyond userId / role is stored in Extra for downstream use.
	extra := make(map[string]interface{})
	skip := map[string]bool{"userId": true, "user_id": true, "uid": true, "role": true, "roles": true}
	for k, v := range extracted {
		if !skip[k] {
			extra[k] = v
		}
	}

	return &Identity{UserID: userID, Role: role, Extra: extra}, nil
}

// extractFlat is the original flat-key lookup used when no mapping is set.
// Preserved for backwards compatibility with callers that still pass raw
// field names via NewMeResolver.
func (r *MeResolver) extractFlat(body map[string]interface{}) (*Identity, error) {
	userID, _ := body[r.UserIDField].(string)
	role, _ := body[r.RoleField].(string)

	if userID == "" {
		return nil, errors.New("missing user id")
	}

	return &Identity{UserID: userID, Role: role}, nil
}

// dotGet traverses a nested map[string]interface{} using a dot-separated path.
//
//	dotGet({"data": {"user": {"id": "u1"}}}, "data.user.id") → "u1", true
//	dotGet({"data": {"user": {}}},            "data.user.id") → nil,  false
func dotGet(obj map[string]interface{}, path string) (interface{}, bool) {
	head, tail, nested := strings.Cut(path, ".")

	val, ok := obj[head]
	if !ok {
		return nil, false
	}

	// Base case: no further segments.
	if !nested {
		return val, true
	}

	// Recurse into the next level.
	child, ok := val.(map[string]interface{})
	if !ok {
		return nil, false
	}

	return dotGet(child, tail)
}

// firstString returns the string value of the first key found in m, or "".
func firstString(m map[string]interface{}, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k]; ok {
			if s, ok := v.(string); ok && s != "" {
				return s
			}
		}
	}
	return ""
}
