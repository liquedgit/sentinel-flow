package identity

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"
)

type MeResolver struct {
	Endpoint    string
	Method      string
	UserIDField string
	RoleField   string
	Client      *http.Client
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

func (r *MeResolver) Resolve(ctx context.Context, req *http.Request) (*Identity, error) {
	meReq, err := http.NewRequestWithContext(ctx, r.Method, r.Endpoint, nil)
	if err != nil {
		return nil, err
	}

	// Forward auth context
	meReq.Header = req.Header.Clone()

	resp, err := r.Client.Do(meReq)
	if err != nil || resp.StatusCode != http.StatusOK {
		return nil, errors.New("failed to resolve identity")
	}
	defer resp.Body.Close()

	var body map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, err
	}

	userID, _ := body[r.UserIDField].(string)
	role, _ := body[r.RoleField].(string)

	if userID == "" {
		return nil, errors.New("missing user id")
	}

	return &Identity{
		UserID: userID,
		Role:   role,
	}, nil
}
