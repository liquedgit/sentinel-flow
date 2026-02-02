package identity

import "net/http"

type Identity struct {
	UserID string
	Role   string
}

type Resolver interface {
	Resolve(req *http.Request) (*Identity, error)
}
