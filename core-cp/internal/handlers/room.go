package handlers

import (
	"github.com/elskow/codepair/core-cp/internal/domain"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type RoomHandler struct {
	roomService domain.RoomService
}

func NewRoomHandler(roomService domain.RoomService) *RoomHandler {
	return &RoomHandler{roomService: roomService}
}

// CreateRoom - Only for interviewers
func (h *RoomHandler) CreateRoom(c *fiber.Ctx) error {
	var request struct {
		CandidateName string `json:"candidateName" validate:"required"`
	}

	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if request.CandidateName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "candidateName is required",
		})
	}

	interviewer := c.Locals("user").(*domain.User)
	room, err := h.roomService.CreateRoom(c.Context(), interviewer, request.CandidateName)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Return complete room data
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":            room.ID,
		"candidateName": room.CandidateName,
		"token":         room.Token,
		"isActive":      room.IsActive,
	})
}

// JoinRoom - For candidates using token
func (h *RoomHandler) JoinRoom(c *fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "token is required",
		})
	}

	room, err := h.roomService.ValidateRoomToken(c.Context(), token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "invalid token",
		})
	}

	return c.JSON(fiber.Map{
		"roomId":        room.ID,
		"candidateName": room.CandidateName,
	})
}

// GetInterviewerRooms - Only for interviewers
func (h *RoomHandler) GetInterviewerRooms(c *fiber.Ctx) error {
	interviewer := c.Locals("user").(*domain.User)
	rooms, err := h.roomService.GetInterviewerRooms(c.Context(), interviewer.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Convert rooms to response format
	roomResponses := make([]fiber.Map, len(rooms))
	for i, room := range rooms {
		roomResponses[i] = fiber.Map{
			"id":            room.ID,
			"candidateName": room.CandidateName,
			"token":         room.Token,
			"isActive":      room.IsActive,
		}
	}

	return c.JSON(roomResponses)
}

// EndInterview - Only for interviewers
func (h *RoomHandler) EndInterview(c *fiber.Ctx) error {
	roomID, err := uuid.Parse(c.Params("roomId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid room ID",
		})
	}

	interviewer := c.Locals("user").(*domain.User)
	if err := h.roomService.EndInterview(c.Context(), roomID, interviewer.ID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.SendStatus(fiber.StatusOK)
}
