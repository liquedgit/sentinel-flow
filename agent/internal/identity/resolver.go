package identity

import (
	"context"
	"net/http"
)

// Identity is the resolved caller identity.
type Identity struct {
	UserID string
	Role   string
	// Extra holds any additional fields extracted via an IdentityMapping
	// (e.g. "permissions", "tenantId"). Nil when no mapping is used.
	Extra map[string]interface{}
}

// Resolver resolves the identity of the caller from an inbound request.
type Resolver interface {
	Resolve(ctx context.Context, req *http.Request) (*Identity, error)
}
