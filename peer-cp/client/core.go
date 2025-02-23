package client

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type CoreClient struct {
	baseURL    string
	httpClient *http.Client
}

type Room struct {
	ID            string `json:"id"`
	RoomID        string `json:"roomId"`
	CandidateName string `json:"candidateName"`
	IsActive      bool   `json:"isActive"`
	Token         string `json:"token,omitempty"`
}

func NewCoreClient(baseURL string) *CoreClient {
	return &CoreClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *CoreClient) ValidateRoom(roomID, token string) (*Room, error) {
	url := fmt.Sprintf("%s/rooms/join?token=%s", c.baseURL, token)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("invalid room or token: status %d", resp.StatusCode)
	}

	var room Room
	if err := json.NewDecoder(resp.Body).Decode(&room); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &room, nil
}
