package handlers

import (
	"net/http"
	"strconv"

	"github.com/elskow/codepair/core-cp/internal/domain"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type RoomHandler struct {
	roomService domain.RoomService
}

func NewRoomHandler(roomService domain.RoomService) *RoomHandler {
	return &RoomHandler{roomService: roomService}
}

func (h *RoomHandler) SearchRooms(c *gin.Context) {
	query := c.Query("q")
	interviewer := c.MustGet("user").(*domain.User)

	rooms, err := h.roomService.SearchRooms(c.Request.Context(), interviewer.ID, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	roomResponses := make([]gin.H, len(rooms))
	for i, room := range rooms {
		roomResponses[i] = gin.H{
			"id":            room.ID,
			"candidateName": room.CandidateName,
			"token":         room.Token,
			"isActive":      room.IsActive,
			"interviewer": gin.H{
				"email": room.Interviewer.Email,
			},
		}
	}

	c.JSON(http.StatusOK, roomResponses)
}

func (h *RoomHandler) UpdateRoomSettings(c *gin.Context) {
	roomID, err := uuid.Parse(c.Param("roomId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid room ID"})
		return
	}

	var settings domain.RoomSettings
	if err := c.ShouldBindJSON(&settings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	interviewer := c.MustGet("user").(*domain.User)
	if err := h.roomService.UpdateRoomSettings(c.Request.Context(), roomID, interviewer.ID, settings); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusOK)
}

// CreateRoom - Only for interviewers
func (h *RoomHandler) CreateRoom(c *gin.Context) {
	var request struct {
		CandidateName string `json:"candidateName" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body",
		})
		return
	}

	interviewer := c.MustGet("user").(*domain.User)
	room, err := h.roomService.CreateRoom(c.Request.Context(), interviewer, request.CandidateName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":            room.ID,
		"candidateName": room.CandidateName,
		"token":         room.Token,
		"isActive":      room.IsActive,
	})
}

// JoinRoom - For candidates using token
func (h *RoomHandler) JoinRoom(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "token is required",
		})
		return
	}

	room, err := h.roomService.ValidateRoomToken(c.Request.Context(), token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "invalid token",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":            room.ID,
		"roomId":        room.ID,
		"candidateName": room.CandidateName,
		"isActive":      room.IsActive,
	})
}

// GetInterviewerRooms - Only for interviewers
func (h *RoomHandler) GetInterviewerRooms(c *gin.Context) {
	interviewer := c.MustGet("user").(*domain.User)

	params := domain.ListRoomsParams{
		SortBy:    c.DefaultQuery("sortBy", "created_at"),
		SortOrder: c.DefaultQuery("sortOrder", "desc"),
		Limit:     20, // Default limit
	}

	if status := c.Query("status"); status != "" {
		isActive := status == "active"
		params.Status = &isActive
	}

	if limit := c.Query("limit"); limit != "" {
		if limitInt, err := strconv.Atoi(limit); err == nil && limitInt > 0 {
			params.Limit = limitInt
		}
	}
	if offset := c.Query("offset"); offset != "" {
		if offsetInt, err := strconv.Atoi(offset); err == nil && offsetInt >= 0 {
			params.Offset = offsetInt
		}
	}

	rooms, err := h.roomService.ListRooms(c.Request.Context(), interviewer.ID, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	roomResponses := make([]gin.H, len(rooms))
	for i, room := range rooms {
		roomResponses[i] = gin.H{
			"id":            room.ID,
			"candidateName": room.CandidateName,
			"token":         room.Token,
			"isActive":      room.IsActive,
			"createdAt":     room.CreatedAt,
			"updatedAt":     room.UpdatedAt,
			"interviewer": gin.H{
				"id":    room.Interviewer.ID,
				"email": room.Interviewer.Email,
				"name":  room.Interviewer.Name,
			},
		}
	}

	c.JSON(http.StatusOK, roomResponses)
}

// EndInterview - Only for interviewers
func (h *RoomHandler) EndInterview(c *gin.Context) {
	roomID, err := uuid.Parse(c.Param("roomId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid room ID",
		})
		return
	}

	interviewer := c.MustGet("user").(*domain.User)
	if err := h.roomService.EndInterview(c.Request.Context(), roomID, interviewer.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.Status(http.StatusOK)
}
