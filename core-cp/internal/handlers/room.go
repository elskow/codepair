package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/elskow/codepair/core-cp/internal/domain"
)

type RoomHandler struct {
	roomService domain.RoomService
}

func NewRoomHandler(roomService domain.RoomService) *RoomHandler {
	return &RoomHandler{roomService: roomService}
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
		"roomId":        room.ID,
		"candidateName": room.CandidateName,
	})
}

// GetInterviewerRooms - Only for interviewers
func (h *RoomHandler) GetInterviewerRooms(c *gin.Context) {
	interviewer := c.MustGet("user").(*domain.User)
	rooms, err := h.roomService.GetInterviewerRooms(c.Request.Context(), interviewer.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Convert rooms to response format
	roomResponses := make([]gin.H, len(rooms))
	for i, room := range rooms {
		roomResponses[i] = gin.H{
			"id":            room.ID,
			"candidateName": room.CandidateName,
			"token":         room.Token,
			"isActive":      room.IsActive,
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
