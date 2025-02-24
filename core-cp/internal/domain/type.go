package domain

type RoomSettings struct {
	IsActive       *bool    `json:"isActive,omitempty"`
	CandidateName  *string  `json:"candidateName,omitempty"`
	ScheduledTime  *string  `json:"scheduledTime,omitempty"`
	Duration       *int     `json:"duration,omitempty"`
	TechnicalStack []string `json:"technicalStack,omitempty"`
	Description    *string  `json:"description,omitempty"`
	Notes          *string  `json:"notes,omitempty"`
}

type ListRoomsParams struct {
	SortBy    string // "created_at" or "updated_at"
	SortOrder string // "asc" or "desc"
	Limit     int
	Offset    int
	Status    *bool // filter by active/inactive
}
