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
	return &RoomHandler{
		roomService: roomService,
	}
}

func (h *RoomHandler) CreateRoom(c *fiber.Ctx) error {
	var request struct {
		Name        string `json:"name" validate:"required"`
		Description string `json:"description"`
		IsPrivate   bool   `json:"isPrivate"`
	}

	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	user := c.Locals("user").(*domain.User)
	room := &domain.Room{
		Name:        request.Name,
		Description: request.Description,
		IsPrivate:   request.IsPrivate,
		CreatedBy:   user.ID,
	}

	if err := h.roomService.CreateRoom(c.Context(), room); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(room)
}

func (h *RoomHandler) JoinRoom(c *fiber.Ctx) error {
	roomID, err := uuid.Parse(c.Params("roomId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid room ID",
		})
	}

	user := c.Locals("user").(*domain.User)

	if err := h.roomService.JoinRoom(c.Context(), user.ID, roomID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "joined room successfully",
	})
}

func (h *RoomHandler) LeaveRoom(c *fiber.Ctx) error {
	roomID, err := uuid.Parse(c.Params("roomId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid room ID",
		})
	}

	user := c.Locals("user").(*domain.User)

	if err := h.roomService.LeaveRoom(c.Context(), user.ID, roomID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "left room successfully",
	})
}

func (h *RoomHandler) GetUserRooms(c *fiber.Ctx) error {
	user := c.Locals("user").(*domain.User)

	rooms, err := h.roomService.GetUserRooms(c.Context(), user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(rooms)
}

func (h *RoomHandler) UpdateRoom(c *fiber.Ctx) error {
	roomID, err := uuid.Parse(c.Params("roomId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid room ID",
		})
	}

	var request struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		IsPrivate   bool   `json:"isPrivate"`
	}

	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	room, err := h.roomService.GetRoom(c.Context(), roomID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "room not found",
		})
	}

	room.Name = request.Name
	room.Description = request.Description
	room.IsPrivate = request.IsPrivate

	if err := h.roomService.UpdateRoom(c.Context(), room); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(room)
}

func (h *RoomHandler) DeleteRoom(c *fiber.Ctx) error {
	roomID, err := uuid.Parse(c.Params("roomId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid room ID",
		})
	}

	if err := h.roomService.DeleteRoom(c.Context(), roomID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *RoomHandler) UpdateUserRole(c *fiber.Ctx) error {
	roomID, err := uuid.Parse(c.Params("roomId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid room ID",
		})
	}

	userID, err := uuid.Parse(c.Params("userId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid user ID",
		})
	}

	var request struct {
		Role string `json:"role" validate:"required,oneof=owner admin member"`
	}

	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if err := h.roomService.UpdateUserRole(c.Context(), userID, roomID, request.Role); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.SendStatus(fiber.StatusOK)
}
