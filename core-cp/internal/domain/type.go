package domain

type RoomSettings struct {
	IsActive      *bool   `json:"isActive,omitempty"`
	CandidateName *string `json:"candidateName,omitempty"`
}
